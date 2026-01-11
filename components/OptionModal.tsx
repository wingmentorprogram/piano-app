import React from 'react';
import { Mic2, FileText, Music, X, Video } from 'lucide-react';
import { Instrument, Preference } from '../types';

interface OptionModalProps {
  instrument: Instrument;
  onClose: () => void;
  onSelectOption: (option: 'LIVE' | 'VIDEO', preference?: Preference) => void;
}

const OptionModal: React.FC<OptionModalProps> = ({ instrument, onClose, onSelectOption }) => {
  const [step, setStep] = React.useState(1);
  const [videoPreference, setVideoPreference] = React.useState<Preference | null>(null);

  const handleVideoClick = () => {
    setStep(2);
  };

  const handlePreferenceSelect = (pref: Preference) => {
    onSelectOption('VIDEO', pref);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-slate-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-bold mb-6 tracking-wide uppercase">
            {instrument} Selected
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {step === 1 ? 'How do you want to play?' : 'What do you need?'}
          </h2>
          <p className="text-slate-500 mb-8">
            {step === 1 ? 'Choose your session type' : 'Select your preferred format'}
          </p>

          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => onSelectOption('LIVE')}
                className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mic2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Record & Play</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Live tracking. We listen and show chords in real-time.
                </p>
              </button>

              <button
                onClick={handleVideoClick}
                className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Video size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Import Video</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Paste a YouTube/Spotify link. Get chords and sheets.
                </p>
              </button>
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <button
                onClick={() => handlePreferenceSelect('SHEET')}
                className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Music Sheet</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Visual sheet music layout for reading.
                </p>
              </button>

              <button
                onClick={() => handlePreferenceSelect('CHORDS')}
                className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Music size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Chords & Lyrics</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Standard chord progression with lyrics.
                </p>
              </button>
            </div>
          )}
        </div>
        
        {step === 2 && (
            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                <button onClick={() => setStep(1)} className="text-sm font-bold text-slate-500 hover:text-slate-800">
                    ← Back
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default OptionModal;