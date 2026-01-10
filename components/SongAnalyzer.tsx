import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Search, Youtube, Music, ArrowRight, Loader2, Clock, Trash2, FileMusic } from 'lucide-react';
import { SongAnalysisResult, HistoryItem } from '../types';

const API_KEY = process.env.API_KEY || '';

const SongAnalyzer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SongAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('songHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (data: SongAnalysisResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      data
    };
    const updatedHistory = [newItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('songHistory', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('songHistory', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (item: HistoryItem) => {
    setResult(item.data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    if (!API_KEY) {
      setError("API Key is missing.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const prompt = `
        Analyze the song identified by: "${query}".
        I need a structured "Music Sheet" format.
        
        Provide the following:
        1. Title, Artist, Key.
        2. Main Chords used.
        3. BREAKDOWN BY SECTIONS. This is critical.
           - Identify sections like "Verse 1", "Chorus", "Bridge", "Intro", "Outro", and "Riff" (for instrumental chord progressions).
           - For each section, provide the lyrics with chords interleaved in brackets, e.g., "[Am] Hello world [C]".
           - If a section is a RIFF or INSTRUMENTAL, strictly label it as "Riff" and provide the chord progression.

        Return valid JSON:
        {
          "title": "string",
          "artist": "string",
          "key": "string",
          "chords": ["string", "string"],
          "sections": [
             { "type": "Verse", "content": "[Am] Line 1..." },
             { "type": "Chorus", "content": "[C] Chorus line..." },
             { "type": "Riff", "content": "[G] [D] [Em] [C]" }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      try {
        const parsed = JSON.parse(text) as SongAnalysisResult;
        setResult(parsed);
        saveToHistory(parsed);
      } catch (e) {
        console.error("JSON Parse Error", text);
        throw new Error("Failed to parse song data. Please try again.");
      }

    } catch (err: any) {
      console.error(err);
      setError("Could not analyze the song. It might be restricted or unknown.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Song Analyzer
        </h2>
        <p className="text-slate-500 text-lg">
          Turn any YouTube link into a playable chord sheet with sections and riffs.
        </p>
      </div>

      <div className="relative group max-w-2xl mx-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-white rounded-xl p-2 flex items-center shadow-xl border border-slate-100">
          <div className="p-3 text-slate-400">
            {query.includes('youtube.com') || query.includes('youtu.be') ? <Youtube className="text-red-500" /> : <Search />}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Search song or paste YouTube URL..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 border-none outline-none text-lg px-2"
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !query}
            className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{result.title}</h3>
                <p className="text-blue-600 text-lg flex items-center gap-2 font-medium">
                  <Music size={20} /> {result.artist}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
                 <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                   <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Key</span>
                   <span className="text-slate-900 font-bold text-xl">{result.key}</span>
                 </div>
                 <div className="flex gap-1 flex-wrap justify-end max-w-xs">
                    {result.chords.map((c, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-mono rounded">
                        {c}
                      </span>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Music Sheet Body */}
          <div className="p-8 space-y-8 bg-white">
            {result.sections ? (
              result.sections.map((section, idx) => (
                <div key={idx} className="relative pl-6 border-l-4 border-slate-200 hover:border-blue-400 transition-colors">
                  <div className="absolute -left-[14px] top-0 bg-white p-1">
                     {section.type === 'Chorus' && <span className="block w-2 h-2 rounded-full bg-blue-500"></span>}
                     {section.type === 'Verse' && <span className="block w-2 h-2 rounded-full bg-slate-400"></span>}
                     {section.type === 'Riff' && <span className="block w-2 h-2 rounded-full bg-pink-500"></span>}
                  </div>
                  
                  <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2
                    ${section.type === 'Chorus' ? 'text-blue-600' : 
                      section.type === 'Riff' ? 'text-pink-600' : 'text-slate-500'}`}
                  >
                    {section.type}
                    {section.type === 'Riff' && <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">INSTRUMENTAL</span>}
                  </h4>
                  
                  <div className="font-mono text-lg leading-loose text-slate-700 whitespace-pre-wrap">
                    {section.content.split(/(\[.*?\])/g).map((part, i) => {
                       if (part.startsWith('[') && part.endsWith(']')) {
                         return (
                           <span key={i} className="inline-block bg-slate-100 text-blue-600 font-bold px-2 py-0.5 rounded mx-1 -translate-y-1 shadow-sm border border-slate-200 text-base">
                             {part.replace(/[\[\]]/g, '')}
                           </span>
                         );
                       }
                       return <span key={i}>{part}</span>;
                    })}
                  </div>
                </div>
              ))
            ) : (
              // Fallback for older format
              <div className="font-mono text-lg leading-loose text-slate-700 whitespace-pre-wrap">
                {result.lyrics}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="pt-12">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" /> Recent Sheets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                     <FileMusic size={20} />
                   </div>
                   <div>
                     <h4 className="font-bold text-slate-800">{item.data.title}</h4>
                     <p className="text-sm text-slate-500">{item.data.artist}</p>
                   </div>
                </div>
                <button 
                  onClick={(e) => deleteHistoryItem(item.id, e)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SongAnalyzer;