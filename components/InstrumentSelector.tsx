import React from 'react';
import { Music2, Guitar, ArrowRight, Library, ListMusic } from 'lucide-react';
import { Instrument } from '../types';

interface InstrumentSelectorProps {
  onSelect: (instrument: Instrument) => void;
  onOpenLibrary: () => void;
}

const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({ onSelect, onOpenLibrary }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in px-4 pb-12">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Instrument</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">
          Select an instrument to customize your jam session, or access your saved songs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Piano Card */}
        <button
          onClick={() => onSelect('PIANO')}
          className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 border border-slate-200 bg-white hover:-translate-y-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 group-hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors duration-500">
              <Music2 size={32} className="text-blue-600 group-hover:text-white transition-colors" />
            </div>
            
            <div className="space-y-2 text-left">
              <h3 className="text-3xl font-bold text-slate-900 group-hover:text-white transition-colors">Piano</h3>
              <p className="text-slate-500 group-hover:text-blue-100 transition-colors font-medium">
                88 Keys. Full Range. MIDI Support.
              </p>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
               <Music2 size={200} className="text-black group-hover:text-white" />
            </div>
          </div>
          
          <div className="absolute bottom-8 right-8 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
            <div className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg">
              <ArrowRight size={24} />
            </div>
          </div>
        </button>

        {/* Guitar Card */}
        <button
          onClick={() => onSelect('GUITAR')}
          className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 border border-slate-200 bg-white hover:-translate-y-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 group-hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors duration-500">
              <Guitar size={32} className="text-orange-600 group-hover:text-white transition-colors" />
            </div>
            
            <div className="space-y-2 text-left">
              <h3 className="text-3xl font-bold text-slate-900 group-hover:text-white transition-colors">Guitar</h3>
              <p className="text-slate-500 group-hover:text-orange-100 transition-colors font-medium">
                6 Strings. Tabs & Chords.
              </p>
            </div>

             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
               <Guitar size={200} className="text-black group-hover:text-white" />
            </div>
          </div>

          <div className="absolute bottom-8 right-8 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
            <div className="w-12 h-12 rounded-full bg-white text-orange-600 flex items-center justify-center shadow-lg">
              <ArrowRight size={24} />
            </div>
          </div>
        </button>

        {/* Playlist Card */}
        <button
          onClick={onOpenLibrary}
          className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/20 border border-slate-200 bg-white hover:-translate-y-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 group-hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors duration-500">
              <ListMusic size={32} className="text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            
            <div className="space-y-2 text-left">
              <h3 className="text-3xl font-bold text-slate-900 group-hover:text-white transition-colors">My Playlist</h3>
              <p className="text-slate-500 group-hover:text-emerald-100 transition-colors font-medium">
                Your saved songs, sheets, and history.
              </p>
            </div>

             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
               <Library size={200} className="text-black group-hover:text-white" />
            </div>
          </div>

          <div className="absolute bottom-8 right-8 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
            <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-lg">
              <ArrowRight size={24} />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default InstrumentSelector;