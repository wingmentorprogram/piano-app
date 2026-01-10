import React, { useState } from 'react';
import { Mic2, Music, Menu, X, BookOpen, Network } from 'lucide-react';
import LiveJamSession from './components/LiveJamSession';
import PianoLibrary from './components/PianoLibrary';
import { AppMode } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE_SESSION:
        return <LiveJamSession />;
      case AppMode.LIBRARY:
        return <PianoLibrary />;
      case AppMode.HOME:
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12 animate-fade-in">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 leading-tight pb-2">
                Unleash Your Inner Pianist
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed font-light">
                Experience real-time AI accompaniment. Analyze songs from YouTube, get chords & lyrics, and play along instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
              <button
                onClick={() => setMode(AppMode.LIVE_SESSION)}
                className="group relative overflow-hidden bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 text-left flex flex-col h-full shadow-sm"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Mic2 size={100} className="text-blue-500" />
                </div>
                <div className="relative z-10 space-y-4 flex-1">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Mic2 size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Studio & Analyzer</h3>
                  <p className="text-slate-500">
                    The all-in-one space. Paste a link to get chords/lyrics, then play along with real-time AI tracking and recording.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.LIBRARY)}
                className="group relative overflow-hidden bg-white p-8 rounded-2xl border border-slate-200 hover:border-emerald-400 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 text-left flex flex-col h-full shadow-sm"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Network size={100} className="text-emerald-500" />
                </div>
                <div className="relative z-10 space-y-4 flex-1">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Piano Library</h3>
                  <p className="text-slate-500">
                    Explore music theory, keys, and chords in an interactive mindmap visualization.
                  </p>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-blue-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => setMode(AppMode.HOME)}
            >
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <Music size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">PianoMuse<span className="text-blue-600">AI</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => setMode(AppMode.LIVE_SESSION)}
                className={`text-sm font-semibold transition-colors ${mode === AppMode.LIVE_SESSION ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Studio
              </button>
              <button 
                onClick={() => setMode(AppMode.LIBRARY)}
                className={`text-sm font-semibold transition-colors ${mode === AppMode.LIBRARY ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Library
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-500 p-2">
                {isMobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <button 
                onClick={() => { setMode(AppMode.LIVE_SESSION); setIsMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              >
                Studio
              </button>
              <button 
                onClick={() => { setMode(AppMode.LIBRARY); setIsMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              >
                Library
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-auto py-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Piano Muse AI. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
}

export default App;