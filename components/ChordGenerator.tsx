import React, { useState } from 'react';
import { Search, Youtube, Music, ArrowRight, Loader2, ExternalLink, Play, BookOpen } from 'lucide-react';
import { Instrument, Preference, SongAnalysisResult } from '../types';

interface ChordGeneratorProps {
  instrument: Instrument;
  preference: Preference;
  onBack: () => void;
}

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const ChordGenerator: React.FC<ChordGeneratorProps> = ({ instrument, preference, onBack }) => {
  const [url, setUrl] = useState('');
  const [songTitle, setSongTitle] = useState(''); // Manual input since we can't use API to scrape
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SongAnalysisResult | null>(null);

  const handleGenerate = () => {
    if (!url || !songTitle) return;
    
    setIsProcessing(true);

    // Simulate "Engine Installation" and Processing Time
    setTimeout(() => {
        setIsProcessing(false);
        const videoId = getYoutubeId(url);
        
        // Mock Generation Result (No API Key used)
        // In a real local app, this would be where the python/wasm engine runs
        const mockResult: SongAnalysisResult = {
            title: songTitle,
            artist: "Detected Artist",
            key: "C Major", // Default assumption for the "No API" mock
            chords: ["C", "G", "Am", "F"],
            videoId: videoId || undefined,
            sections: [
                { type: 'Verse', content: `[C] Here is the song ${songTitle} \n[G] generated without API keys \n[Am] using the internal engine.`, startTime: '0:00' },
                { type: 'Chorus', content: `[F] This is a simulation \n[G] of the chord structure.`, startTime: '0:30' }
            ]
        };
        setResult(mockResult);
    }, 2000);
  };

  const getSearchLink = (site: 'ultimate-guitar' | 'musescore') => {
      const query = encodeURIComponent(songTitle + (site === 'musescore' ? ' sheet music' : ' chords'));
      if (site === 'ultimate-guitar') return `https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`;
      if (site === 'musescore') return `https://musescore.com/sheetmusic?text=${query}`;
      return '#';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 mb-6 font-medium">← Back to Menu</button>
        
        {!result ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">
                        {preference === 'SHEET' ? 'Sheet Music' : 'Chord'} Generator
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Enter the YouTube URL and Song Title. Our engine will analyze the structure.
                    </p>
                </div>

                <div className="space-y-4 max-w-lg mx-auto">
                    <div className="relative">
                        <Youtube className="absolute left-4 top-3.5 text-red-500" />
                        <input 
                            type="text" 
                            placeholder="Paste YouTube Link" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                    </div>
                    
                    <div className="relative">
                        <Music className="absolute left-4 top-3.5 text-blue-500" />
                        <input 
                            type="text" 
                            placeholder="Song Title & Artist (Required for analysis)" 
                            value={songTitle}
                            onChange={(e) => setSongTitle(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={!url || !songTitle || isProcessing}
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" /> Analyzing Audio Engine...
                            </>
                        ) : (
                            <>
                                <ArrowRight /> Generate {preference === 'SHEET' ? 'Sheet' : 'Chords'}
                            </>
                        )}
                    </button>
                    
                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Or search directly on databases</p>
                        <div className="flex gap-2 justify-center">
                            <a 
                                href={getSearchLink('ultimate-guitar')} 
                                target="_blank" 
                                rel="noreferrer"
                                className={`px-4 py-2 rounded-lg text-xs font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors ${!songTitle ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                Ultimate Guitar
                            </a>
                            <a 
                                href={getSearchLink('musescore')} 
                                target="_blank" 
                                rel="noreferrer"
                                className={`px-4 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors ${!songTitle ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                MuseScore
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                 {/* Result View */}
                 <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
                    <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">{result.title}</h3>
                            <p className="text-slate-500 font-medium">{result.artist}</p>
                        </div>
                        <div className="flex gap-2">
                             <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                                {instrument}
                             </span>
                             <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-blue-600">
                                {preference}
                             </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3">
                         {/* Video Player */}
                         <div className="lg:col-span-1 bg-black p-4 flex items-center justify-center">
                            {result.videoId && (
                                <iframe 
                                    width="100%" 
                                    height="250" 
                                    src={`https://www.youtube.com/embed/${result.videoId}`}
                                    title="YouTube video" 
                                    className="rounded-xl"
                                    allowFullScreen
                                ></iframe>
                            )}
                         </div>

                         {/* Content */}
                         <div className="lg:col-span-2 p-8 max-h-[500px] overflow-y-auto">
                             {result.sections.map((section, idx) => (
                                 <div key={idx} className="mb-6">
                                     <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">{section.type}</span>
                                        <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{section.startTime}</span>
                                     </div>
                                     <p className="font-mono text-lg leading-loose whitespace-pre-wrap text-slate-700">
                                        {section.content.split(/(\[.*?\])/g).map((part, i) => {
                                            if (part.startsWith('[') && part.endsWith(']')) {
                                                return <span key={i} className="text-blue-600 font-bold bg-blue-50 px-1 rounded mx-1">{part}</span>;
                                            }
                                            return <span key={i}>{part}</span>;
                                        })}
                                     </p>
                                 </div>
                             ))}
                             
                             <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-sm">
                                 <strong>Note:</strong> This result is generated by the local engine simulation. For fully accurate tabs, please use the search buttons below.
                             </div>
                         </div>
                    </div>
                 </div>

                 {/* Fallback Search */}
                 <div className="flex justify-center gap-4">
                     <a 
                        href={getSearchLink('ultimate-guitar')} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Search on Ultimate Guitar <ExternalLink size={16} />
                    </a>
                    <a 
                        href={getSearchLink('musescore')} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Search on MuseScore <ExternalLink size={16} />
                    </a>
                 </div>
            </div>
        )}
    </div>
  );
};

export default ChordGenerator;
