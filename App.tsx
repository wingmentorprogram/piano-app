import React, { useState } from 'react';
import { Music, Menu, X, BookOpen } from 'lucide-react';
import LiveJamSession from './components/LiveJamSession';
import PianoLibrary from './components/PianoLibrary';
import InstrumentSelector from './components/InstrumentSelector';
import OptionModal from './components/OptionModal';
import ChordGenerator from './components/ChordGenerator';
import { AppMode, Instrument, Preference } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [generatorPreference, setGeneratorPreference] = useState<Preference>('CHORDS');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Flow Handlers
  const handleInstrumentSelect = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setIsOptionModalOpen(true);
  };

  const handleOptionSelect = (option: 'LIVE' | 'VIDEO', pref?: Preference) => {
    setIsOptionModalOpen(false);
    if (option === 'LIVE') {
      setMode(AppMode.LIVE_SESSION);
    } else {
      setGeneratorPreference(pref || 'CHORDS');
      setMode(AppMode.CHORD_GENERATOR);
    }
  };

  const handleBackToLanding = () => {
    setMode(AppMode.LANDING);
    setSelectedInstrument(null);
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE_SESSION:
        return (
            <div className="space-y-4">
                <button onClick={handleBackToLanding} className="text-slate-500 hover:text-slate-900 font-medium">← Back to Menu</button>
                <LiveJamSession />
            </div>
        );
      case AppMode.CHORD_GENERATOR:
        return (
            <ChordGenerator 
                instrument={selectedInstrument || 'PIANO'} 
                preference={generatorPreference}
                onBack={handleBackToLanding}
            />
        );
      case AppMode.LIBRARY:
        return <PianoLibrary />;
      case AppMode.LANDING:
      default:
        return (
            <InstrumentSelector 
                onSelect={handleInstrumentSelect} 
                onOpenLibrary={() => setMode(AppMode.LIBRARY)}
            />
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
              onClick={handleBackToLanding}
            >
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <Music size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">PianoMuse<span className="text-blue-600">AI</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={handleBackToLanding}
                className={`text-sm font-semibold transition-colors ${mode === AppMode.LANDING ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Instruments
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
                onClick={() => { handleBackToLanding(); setIsMobileMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              >
                Instruments
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

      {/* Modal for Instrument Flow */}
      {isOptionModalOpen && selectedInstrument && (
        <OptionModal 
            instrument={selectedInstrument}
            onClose={() => setIsOptionModalOpen(false)}
            onSelectOption={handleOptionSelect}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-auto py-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Piano Muse AI. Next-Gen Music Engine.</p>
      </footer>
    </div>
  );
}

export default App;