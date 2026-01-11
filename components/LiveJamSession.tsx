import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob } from '../services/audioUtils';
import AudioVisualizer from './AudioVisualizer';
import VirtualPiano from './VirtualPiano';
import { Mic, Square, Loader2, Music2, Disc, Download, Play, Trash2, BookOpen, Youtube, Search, ArrowRight, FileText, Music, ExternalLink, Video, RefreshCw, Cable, FileUp } from 'lucide-react';
import { HistoryItem, SongAnalysisResult, SongSection } from '../types';

const SYSTEM_INSTRUCTION = `
You are an expert musical accompanist. Your primary task is to LISTEN to the musical input (piano/guitar/voice).
1. INSTANTLY identify the chords being played. Output them strictly in brackets, e.g., [C], [Am7], [G/B], [F#m].
2. If you hear lyrics, transcribe them after the chord.
3. BE CONCISE. Do not chat.
4. Output Format: "[CHORD] Lyrics...".
5. Even if there are no lyrics, output the detected chord updates like "[C] ... [G] ...".
`;

// Helper for play-along tracking
interface FlattenedSegment {
  sectionType: string;
  chord: string;
  text: string;
  sectionIndex: number;
  segmentIndex: number; // Index within the whole song flattened
  startTime?: string;
}

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getSpotifyId = (url: string) => {
  const regExp = /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const getMusescoreUrl = (url: string) => {
  // Matches https://musescore.com/user/USERID/scores/SCOREID
  const regExp = /musescore\.com\/user\/\d+\/scores\/\d+/;
  const match = url.match(regExp);
  return match ? `https://${match[0]}/embed` : null;
};

const parseTimestamp = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
};

// --- MusicXML Parser ---
const parseMusicXML = (xmlText: string): SongAnalysisResult => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const title = doc.querySelector('work-title')?.textContent || doc.querySelector('movement-title')?.textContent || "Untitled Score";
  const artist = doc.querySelector('creator[type="composer"]')?.textContent || "Unknown Composer";

  // Key detection (naive, from first attribute found)
  const fifthsNode = doc.querySelector('fifths');
  let key = "C";
  if (fifthsNode && fifthsNode.textContent) {
    const f = parseInt(fifthsNode.textContent);
    // Circle of fifths map
    const majorKeys: {[key: number]: string} = {
      0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#",
      [-1]: "F", [-2]: "Bb", [-3]: "Eb", [-4]: "Ab", [-5]: "Db", [-6]: "Gb", [-7]: "Cb"
    };
    if (majorKeys[f]) key = majorKeys[f] + " Major";
  }

  // Parse Measures for Sections, Chords, Lyrics
  const sections: SongSection[] = [];
  let currentSectionTitle = "General";
  let currentSectionContent = "";
  const allChords = new Set<string>();

  const parts = doc.querySelectorAll('part');
  // Usually P1 is the main part in simple MusicXML
  if (parts.length > 0) {
    const measures = parts[0].querySelectorAll('measure');
    
    measures.forEach((measure) => {
      // Check for Rehearsal Marks to split sections
      const directions = measure.querySelectorAll('direction');
      directions.forEach(dir => {
        const rehearsal = dir.querySelector('rehearsal');
        if (rehearsal && rehearsal.textContent) {
           // Push previous section if it has content
           if (currentSectionContent.trim()) {
             sections.push({ type: currentSectionTitle as any, content: currentSectionContent.trim() });
           }
           currentSectionTitle = rehearsal.textContent.replace(/[\[\]]/g, '') || "Section";
           currentSectionContent = "";
        }
      });

      // Parse Measure Children (Notes and Harmonies)
      // We iterate children to maintain order
      const children = Array.from(measure.children);
      
      children.forEach(child => {
        if (child.tagName === 'harmony') {
          const rootStep = child.querySelector('root > root-step')?.textContent;
          const rootAlter = child.querySelector('root > root-alter')?.textContent;
          const kind = child.querySelector('kind')?.getAttribute('text') || child.querySelector('kind')?.textContent;
          
          if (rootStep) {
             let chord = rootStep;
             if (rootAlter === '1') chord += '#';
             if (rootAlter === '-1') chord += 'b';
             
             // Simple kind mapping
             if (kind) {
               const k = kind.toLowerCase();
               if (k === 'minor' || k === 'min') chord += 'm';
               else if (k === 'major' || k === 'maj') chord += '';
               else if (k.includes('min') && k.includes('7')) chord += 'm7';
               else if (k.includes('maj') && k.includes('7')) chord += 'maj7';
               else if (k === 'dominant' || k === '7') chord += '7';
               else if (k === 'diminished' || k === 'dim') chord += 'dim';
               else if (k === 'augmented' || k === 'aug') chord += 'aug';
             }
             
             currentSectionContent += ` [${chord}] `;
             allChords.add(chord);
          }
        } else if (child.tagName === 'note') {
           const lyric = child.querySelector('lyric > text')?.textContent;
           // Avoid adding empty spaces for every note, only when lyric exists
           if (lyric && lyric.trim()) {
             // Basic spacing logic
             const syllabic = child.querySelector('lyric > syllabic')?.textContent;
             if (syllabic === 'single' || syllabic === 'end') {
                currentSectionContent += lyric + " ";
             } else {
                currentSectionContent += lyric; // middle or begin, no space
             }
           }
        }
      });
    });
  }

  // Push final section
  if (currentSectionContent.trim()) {
     sections.push({ type: currentSectionTitle as any, content: currentSectionContent.trim() });
  }

  // Fallback if no sections created
  if (sections.length === 0) {
    sections.push({ type: 'General', content: "No lyrics or chords found in XML." });
  }

  return {
    title,
    artist,
    key,
    chords: Array.from(allChords),
    sections
  };
};

const LiveJamSession: React.FC = () => {
  // Session State
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // MIDI State
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [midiEnabled, setMidiEnabled] = useState(false);

  // Analysis / Song State
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<'SHEET' | 'CHORDS'>('SHEET');
  
  // Play Along State
  const [mode, setMode] = useState<'JAM' | 'PLAY_ALONG'>('JAM');
  const [availableSongs, setAvailableSongs] = useState<HistoryItem[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongAnalysisResult | null>(null);
  const [flatSegments, setFlatSegments] = useState<FlattenedSegment[]>([]);
  const [currentGlobalIndex, setCurrentGlobalIndex] = useState<number>(0);
  const [sources, setSources] = useState<any[]>([]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const transcriptionEndRef = useRef<HTMLDivElement>(null);
  const activeSectionRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('songHistory');
    if (saved) {
      try {
        setAvailableSongs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load songs", e);
      }
    }
  }, []);

  // --- MIDI SETUP ---
  useEffect(() => {
    if ((navigator as any).requestMIDIAccess) {
      (navigator as any).requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    }

    function onMIDISuccess(midiAccess: any) {
      // Check if inputs exist
      if (midiAccess.inputs.size > 0) {
        setMidiEnabled(true);
      }
      
      for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = getMIDIMessage;
      }

      midiAccess.onstatechange = (e: any) => {
         if (e.port.type === 'input') {
             if (e.port.state === 'connected') {
                 setMidiEnabled(true);
                 e.port.onmidimessage = getMIDIMessage;
             } else if (e.port.state === 'disconnected' && midiAccess.inputs.size === 0) {
                 setMidiEnabled(false);
             }
         }
      };
    }

    function onMIDIFailure() {
      console.warn("Could not access your MIDI devices.");
    }

    function getMIDIMessage(message: any) {
      const command = message.data[0];
      const note = message.data[1];
      const velocity = (message.data.length > 2) ? message.data[2] : 0;

      // Note On
      if (command === 144 && velocity > 0) {
          setActiveMidiNotes(prev => {
              const next = new Set(prev);
              next.add(note);
              return next;
          });
      } 
      // Note Off
      else if (command === 128 || (command === 144 && velocity === 0)) {
          setActiveMidiNotes(prev => {
              const next = new Set(prev);
              next.delete(note);
              return next;
          });
      }
    }
  }, []);

  // --- ANALYSIS LOGIC ---
  const handleAnalyze = async () => {
    if (!query.trim()) return;
    if (!process.env.API_KEY) {
      setError("API Key is missing.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const videoId = getYoutubeId(query);
      const spotifyId = getSpotifyId(query);
      const musescoreUrl = getMusescoreUrl(query);
      
      const prompt = `
        Task: Identify the song and provide a musical analysis suitable for learning in segments.
        Input: "${query}"
        
        Steps:
        1. If the input is a URL (YouTube, Spotify, MuseScore), use Google Search to find the exact Song Title and Artist.
        2. Generate a structured ${analysisType === 'SHEET' ? 'Full Sheet Music' : 'Chord Chart'}.
        3. CRITICAL: Try to estimate the "startTime" (e.g., "0:00", "0:45", "1:20") for each section based on the original studio recording structure.
        
        Output Format:
        Return valid JSON inside a code block like:
        \`\`\`json
        {
          "title": "Song Title",
          "artist": "Artist Name",
          "key": "C Major",
          "chords": ["C", "G", "Am", "F"],
          "sections": [
             { "type": "Intro", "content": "[C] ...", "startTime": "0:00" },
             { "type": "Verse 1", "content": "[C] Lyrics...", "startTime": "0:15" },
             { "type": "Chorus", "content": "[F] Lyrics...", "startTime": "0:55" }
          ]
        }
        \`\`\`
        
        Requirements:
        - Accurately identify the song.
        - 'startTime' is optional but highly recommended for learning segments.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      // Extract grounding sources
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        setSources(response.candidates[0].groundingMetadata.groundingChunks);
      }

      let text = response.text || "";
      if (!text) throw new Error("No response from AI");

      // Robust JSON extraction
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      } else {
         const firstOpen = text.indexOf('{');
         const lastClose = text.lastIndexOf('}');
         if (firstOpen !== -1 && lastClose !== -1) {
            text = text.substring(firstOpen, lastClose + 1);
         }
      }

      try {
        const parsed = JSON.parse(text) as SongAnalysisResult;
        
        // Inject IDs
        if (videoId) parsed.videoId = videoId;
        if (spotifyId) parsed.spotifyId = spotifyId;
        if (musescoreUrl) parsed.musescoreUrl = musescoreUrl;

        // Save to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          data: parsed
        };
        const updatedHistory = [newItem, ...availableSongs].slice(0, 10);
        setAvailableSongs(updatedHistory);
        localStorage.setItem('songHistory', JSON.stringify(updatedHistory));
        
        // Auto-select and switch mode
        setSelectedSong(parsed);
        setMode('PLAY_ALONG');
        setQuery(''); // Clear input
      } catch (e) {
        console.error("JSON Parse Error", text);
        throw new Error("Failed to parse song data. Please try again.");
      }

    } catch (err: any) {
      console.error(err);
      setError("Could not analyze the song. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
            const parsed = parseMusicXML(content);
            
            // Save to history
            const newItem: HistoryItem = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              data: parsed
            };
            const updatedHistory = [newItem, ...availableSongs].slice(0, 10);
            setAvailableSongs(updatedHistory);
            localStorage.setItem('songHistory', JSON.stringify(updatedHistory));
            
            // Set active
            setSelectedSong(parsed);
            setMode('PLAY_ALONG');
            setQuery(''); 
        } catch (err) {
            console.error(err);
            setError("Failed to parse MusicXML file.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // --- PLAY ALONG PARSING ---
  useEffect(() => {
    if (selectedSong) {
      const flattened: FlattenedSegment[] = [];
      let globalIdx = 0;

      const sectionsToProcess = selectedSong.sections || [
        { type: 'General', content: selectedSong.lyrics || '' }
      ] as SongSection[];

      sectionsToProcess.forEach((section, sIdx) => {
        const regex = /\[(.*?)\]([^\[]*)/g;
        let match;
        const content = section.content;

        if (!content.includes('[')) {
           flattened.push({
             sectionType: section.type,
             chord: '',
             text: content,
             sectionIndex: sIdx,
             segmentIndex: globalIdx++,
             startTime: section.startTime
           });
        } else {
           while ((match = regex.exec(content)) !== null) {
             flattened.push({
               sectionType: section.type,
               chord: match[1].trim(),
               text: match[2].trim(),
               sectionIndex: sIdx,
               segmentIndex: globalIdx++,
               startTime: section.startTime
             });
           }
        }
      });
      
      setFlatSegments(flattened);
      setCurrentGlobalIndex(0);
    }
  }, [selectedSong]);

  useEffect(() => {
    if (activeSectionRef.current) {
      activeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentGlobalIndex]);

  // --- VIDEO CONTROL ---
  const seekToTime = (timeStr?: string) => {
    if (!timeStr || !selectedSong?.videoId) return;
    const seconds = parseTimestamp(timeStr);
    if (seconds !== null && youtubePlayerRef.current && youtubePlayerRef.current.contentWindow) {
      // Send command to YouTube Iframe API
      youtubePlayerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }), 
        '*'
      );
      youtubePlayerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 
        '*'
      );
    }
  };

  // --- AUDIO SESSION LOGIC ---
  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const stopSession = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setIsActive(false);
    if (sessionRef.current) sessionRef.current = null;
    cleanupAudio();
  }, [cleanupAudio, isRecording]);

  const startSession = async () => {
    if (!process.env.API_KEY) {
      setError("API Key is missing.");
      return;
    }
    setError(null);
    setIsConnecting(true);

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false 
      }});
      
      setStream(audioStream);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            console.log("Live session connected");
            setIsConnecting(false);
            setIsActive(true);
            
            if (sourceRef.current && processorRef.current && audioContextRef.current) {
                sourceRef.current.connect(processorRef.current);
                processorRef.current.connect(audioContextRef.current.destination);
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setTranscription(prev => prev + text);
               
               if (mode === 'PLAY_ALONG' && selectedSong) {
                 handlePlayAlongLogic(text);
               }
            }
          },
          onclose: () => stopSession(),
          onerror: (err) => {
            console.error(err);
            setError("Connection interrupted. Please try again.");
            stopSession();
          }
        }
      });

      sessionRef.current = sessionPromise;

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
      };

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not access microphone.");
      setIsConnecting(false);
      cleanupAudio();
    }
  };

  const handlePlayAlongLogic = (text: string) => {
    const chordRegex = /\[(.*?)\]/g;
    let match;
    while ((match = chordRegex.exec(text)) !== null) {
      const detectedChord = match[1].trim(); 
      setCurrentGlobalIndex(prevIndex => {
         if (prevIndex >= flatSegments.length) return prevIndex;
         const expectedSegment = flatSegments[prevIndex];
         const expectedChord = expectedSegment?.chord;
         
         if (!expectedChord) return prevIndex + 1;

         const cleanDetected = detectedChord.replace(/maj|min|m|7|dim|sus|4|2/g, '').trim();
         const cleanExpected = expectedChord.replace(/maj|min|m|7|dim|sus|4|2/g, '').trim();

         if (cleanDetected === cleanExpected || detectedChord === expectedChord) {
           return prevIndex + 1;
         }
         return prevIndex;
      });
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedAudioUrl(url);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  const renderPlayAlongView = () => {
    if (!selectedSong) return null;
    
    // Group segments by section
    const sections: { type: string; startTime?: string; segments: FlattenedSegment[] }[] = [];
    if (flatSegments.length > 0) {
      let currentSectionIdx = -1;
      flatSegments.forEach(seg => {
        if (seg.sectionIndex !== currentSectionIdx) {
          sections.push({ type: seg.sectionType, startTime: seg.startTime, segments: [] });
          currentSectionIdx = seg.sectionIndex;
        }
        sections[sections.length - 1].segments.push(seg);
      });
    }

    return (
      <div className="flex flex-col lg:flex-row h-full gap-6">
        {/* Left Side: Video & Info (Sticky on Desktop) */}
        <div className="lg:w-1/3 flex-shrink-0">
          <div className="lg:sticky lg:top-4 space-y-4">
             {(selectedSong.videoId || selectedSong.spotifyId || selectedSong.musescoreUrl) && (
                <>
                    {/* YouTube Player */}
                    {selectedSong.videoId && (
                      <div className="rounded-xl overflow-hidden shadow-lg bg-black aspect-video relative group">
                          <iframe 
                              ref={youtubePlayerRef}
                              width="100%" 
                              height="100%" 
                              src={`https://www.youtube.com/embed/${selectedSong.videoId}?enablejsapi=1`}
                              title="YouTube video player" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                              className="absolute inset-0"
                          ></iframe>
                      </div>
                    )}
                    
                    {/* Spotify Player */}
                    {selectedSong.spotifyId && (
                      <div className="rounded-xl overflow-hidden shadow-lg bg-black relative h-[352px] w-full">
                          <iframe 
                            src={`https://open.spotify.com/embed/track/${selectedSong.spotifyId}`}
                            width="100%" 
                            height="352" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"
                            className="border-0"
                          ></iframe>
                      </div>
                    )}
                    
                    {/* MuseScore Embed */}
                    {selectedSong.musescoreUrl && (
                      <div className="rounded-xl overflow-hidden shadow-lg bg-white relative w-full h-[394px]">
                          <iframe 
                            id="score-iframe"
                            src={selectedSong.musescoreUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; fullscreen"
                          ></iframe>
                      </div>
                    )}
                </>
             )}

             {/* Metadata Card */}
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                   {selectedSong.videoId ? <Video size={16} className="text-red-500" /> : selectedSong.spotifyId ? <Music size={16} className="text-green-500" /> : selectedSong.musescoreUrl ? <BookOpen size={16} className="text-blue-500" /> : <FileText size={16} className="text-blue-500" />} 
                   {selectedSong.videoId || selectedSong.spotifyId || selectedSong.musescoreUrl ? 'Media Player' : 'Music Sheet'}
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedSong.videoId 
                    ? "Use the 'Play' buttons on sections to jump to that part of the video." 
                    : selectedSong.musescoreUrl ? "Follow the sheet music." : "Jam along with the track."}
                </p>
             </div>

             {/* MIDI Widget if Active */}
             {midiEnabled && (
                <VirtualPiano activeNotes={Array.from(activeMidiNotes)} />
             )}
          </div>
        </div>

        {/* Right Side: Chords */}
        <div className={`flex-1 space-y-8 pb-12 ${selectedSong.videoId || selectedSong.spotifyId || selectedSong.musescoreUrl ? '' : 'mx-auto max-w-4xl'}`}>
            <div className="text-center border-b border-slate-200 pb-6">
            <h3 className="text-3xl font-bold text-slate-900">{selectedSong.title}</h3>
            <p className="text-slate-500 font-medium">{selectedSong.artist}</p>
            <div className="flex justify-center gap-2 mt-2">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">Key: {selectedSong.key}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{analysisType === 'SHEET' ? 'Sheet View' : 'Chord View'}</span>
                {midiEnabled && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1"><Cable size={10} /> MIDI Connected</span>}
            </div>
            
            {sources.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {sources.map((s, i) => (
                    s.web?.uri ? (
                        <a key={i} href={s.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200 transition-colors">
                        <ExternalLink size={10} /> {s.web.title || 'Source'}
                        </a>
                    ) : null
                    ))}
                </div>
            )}
            </div>
            
            <div className="space-y-8 px-2 md:px-4">
            {sections.map((section, idx) => {
                const isSectionActive = section.segments.some(s => s.segmentIndex === currentGlobalIndex);
                
                return (
                <div 
                    key={idx}
                    ref={isSectionActive ? activeSectionRef : null}
                    className={`rounded-2xl p-6 transition-all duration-500 border-2 relative
                    ${isSectionActive 
                        ? 'bg-white border-blue-400 shadow-xl scale-100 ring-4 ring-blue-50/50' 
                        : 'bg-slate-50 border-transparent opacity-80'
                    }`}
                >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
                            ${section.type === 'Riff' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                            {section.type}
                        </span>
                        
                        {/* Play/Jump Button for Learning Segments */}
                        {selectedSong.videoId && section.startTime && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); seekToTime(section.startTime); }}
                            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 px-2 py-1 rounded-full transition-colors"
                            title={`Jump to ${section.startTime}`}
                          >
                            <Play size={10} fill="currentColor" /> {section.startTime}
                          </button>
                        )}
                      </div>
                      
                      {section.type === 'Riff' && <Music2 size={16} className="text-pink-500" />}
                    </div>

                    <div className="flex flex-wrap gap-x-2 gap-y-6 leading-loose">
                    {section.segments.map((seg) => {
                        const isSegActive = seg.segmentIndex === currentGlobalIndex;
                        const isPast = seg.segmentIndex < currentGlobalIndex;
                        
                        return (
                        <div key={seg.segmentIndex} className={`relative transition-all duration-300 ${isSegActive ? 'scale-105' : ''}`}>
                            {seg.chord && (
                            <div className={`absolute -top-6 left-0 text-sm font-bold font-mono px-1 rounded
                                ${isSegActive ? 'bg-blue-600 text-white shadow-md z-10' : 
                                isPast ? 'text-slate-400' : 'text-blue-600'}`}>
                                {seg.chord}
                            </div>
                            )}
                            <span className={`text-xl font-medium px-1 rounded
                            ${isSegActive ? 'bg-yellow-200 text-slate-900' : 
                                isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                                {seg.text || (seg.chord ? '...' : '')}
                            </span>
                        </div>
                        );
                    })}
                    </div>
                </div>
                );
            })}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* 1. INPUT / ANALYSIS SECTION */}
      {!isActive && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full flex items-center gap-2">
                <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    {query.includes('spotify') ? <Music className="text-green-500" /> : query.includes('youtu') ? <Youtube className="text-red-500" /> : <Search />}
                    </div>
                    <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    placeholder="Paste YouTube, Spotify, or MuseScore link..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                
                {/* File Upload Button */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".xml,.musicxml" 
                    className="hidden" 
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                    title="Import MusicXML File"
                >
                    <FileUp size={20} />
                </button>
             </div>
             
             <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setAnalysisType('SHEET')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${analysisType === 'SHEET' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileText size={16} /> Music Sheets
                </button>
                <button 
                  onClick={() => setAnalysisType('CHORDS')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${analysisType === 'CHORDS' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Music size={16} /> Music Chords
                </button>
             </div>

             <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !query}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg whitespace-nowrap"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                Analyze
              </button>
          </div>
        </div>
      )}

      {/* 2. JAM CONTROL BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Music2 className="text-blue-600" />
            Studio
          </h2>
          {mode === 'PLAY_ALONG' && selectedSong && (
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
              {selectedSong.title}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Switcher */}
          {selectedSong && !isActive && (
             <div className="flex bg-slate-200 rounded-lg p-1">
               <button onClick={() => setMode('JAM')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'JAM' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Free Jam</button>
               <button onClick={() => setMode('PLAY_ALONG')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'PLAY_ALONG' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Play Along</button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isConnecting && <span className="text-blue-500 text-sm animate-pulse font-medium">Connecting...</span>}
            {isActive && <span className="text-green-600 text-sm animate-pulse font-medium flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Live AI</span>}
          </div>
        </div>
      </div>

      {/* 3. VISUALIZER & MIC CONTROLS */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
        <div className="mb-6 relative">
          <AudioVisualizer stream={stream} isActive={isActive} color={isRecording ? '#ef4444' : '#3b82f6'} />
          
          {/* Overlay controls when active */}
          {isActive && (
            <div className="absolute top-4 right-4 flex gap-2">
                 {!isRecording ? (
                 <button 
                   onClick={startRecording}
                   className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white/90 hover:bg-red-50 text-slate-700 hover:text-red-500 border border-slate-200 shadow-sm transition-colors backdrop-blur-sm"
                 >
                   <div className="w-3 h-3 rounded-full bg-red-500"></div> Start Recording
                 </button>
               ) : (
                 <button 
                   onClick={stopRecording}
                   className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-red-50/90 text-red-600 animate-pulse border border-red-200 backdrop-blur-sm"
                 >
                    <Square size={10} fill="currentColor" /> Stop Recording
                 </button>
               )}
            </div>
          )}
        </div>
        
        {/* Render MIDI Keyboard ONLY in JAM mode or if explicitly connected and we want to see it always */}
        {midiEnabled && mode === 'JAM' && (
             <div className="mb-6">
                <VirtualPiano activeNotes={Array.from(activeMidiNotes)} />
             </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center gap-4">
            {!isActive ? (
              <button
                onClick={startSession}
                disabled={isConnecting || (mode === 'PLAY_ALONG' && !selectedSong)}
                className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl ${
                  isConnecting || (mode === 'PLAY_ALONG' && !selectedSong)
                    ? 'bg-slate-200 cursor-not-allowed text-slate-400' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isConnecting ? <Loader2 className="animate-spin" /> : <Mic />}
                {isConnecting ? 'Initializing...' : (mode === 'PLAY_ALONG' ? 'Start Playing' : 'Start Free Jam')}
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="flex items-center gap-2 px-8 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-full font-bold text-lg transition-all"
              >
                <Square fill="currentColor" size={16} />
                Stop Session
              </button>
            )}
          </div>

          {/* Quick Library Select if Play Along active but no song */}
          {mode === 'PLAY_ALONG' && !isActive && !selectedSong && availableSongs.length > 0 && (
             <div className="w-full max-w-md mt-2">
                <select 
                  onChange={(e) => {
                    const song = availableSongs.find(s => s.id === e.target.value);
                    if (song) setSelectedSong(song.data);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2 text-sm"
                >
                  <option value="">Or select from history...</option>
                  {availableSongs.map(s => (
                    <option key={s.id} value={s.id}>{s.data.title}</option>
                  ))}
                </select>
             </div>
          )}
          
          {recordedAudioUrl && (
             <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 animate-fade-in shadow-sm w-full max-w-lg justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full">
                        <Disc className="text-red-500 animate-spin-slow" size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-slate-500">Session Recording</span>
                        <audio src={recordedAudioUrl} controls className="h-6 w-48 lg:w-64" />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <a 
                    href={recordedAudioUrl} 
                    download={`pianomuse-recording-${Date.now()}.webm`}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200"
                    title="Download"
                    >
                    <Download size={18} />
                    </a>
                    <button 
                    onClick={clearRecording}
                    className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"
                    title="Delete"
                    >
                    <Trash2 size={18} />
                    </button>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* 4. MAIN OUTPUT AREA */}
      <div className="flex-1 min-h-[400px] bg-white rounded-2xl p-6 border border-slate-200 relative overflow-hidden shadow-inner">
        <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
        
        {mode === 'JAM' ? (
          <div className="h-full overflow-y-auto font-mono text-lg leading-relaxed space-y-2 pb-8">
             {transcription ? (
               <p className="whitespace-pre-wrap text-slate-700">
                 {transcription.split(/(\[.*?\])/g).map((part, i) => {
                   if (part.startsWith('[') && part.endsWith(']')) {
                     return <span key={i} className="text-blue-600 font-bold mx-1 bg-blue-50 px-1 rounded">{part}</span>;
                   }
                   return <span key={i}>{part}</span>;
                 })}
               </p>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Music2 size={48} className="mb-4 opacity-20" />
                  <p>Start playing to see chords and lyrics here...</p>
                  {midiEnabled && <p className="text-sm mt-2 text-blue-500">MIDI Device Connected. Play notes to visualize.</p>}
               </div>
             )}
             <div ref={transcriptionEndRef} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto scroll-smooth">
            {selectedSong ? renderPlayAlongView() : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BookOpen size={48} className="mb-4 opacity-20" />
                  <p>Analyze a song above or select one to start.</p>
               </div>
            )}
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center font-medium">
          {error}
        </div>
      )}
    </div>
  );
};

export default LiveJamSession;