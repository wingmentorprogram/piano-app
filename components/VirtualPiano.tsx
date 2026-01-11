import React, { useRef, useEffect } from 'react';

interface VirtualPianoProps {
  activeNotes: number[];
}

const VirtualPiano: React.FC<VirtualPianoProps> = ({ activeNotes }) => {
  // Full 88-key piano range: A0 (21) to C8 (108)
  const startNote = 21;
  const endNote = 108;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isBlackKey = (note: number) => {
    const n = note % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  };

  const whiteKeyWidth = 36;
  const blackKeyWidth = 20;
  const height = 100;
  
  // Calculate white key positions
  const keyPositions: { [key: number]: number } = {};
  let currentX = 0;
  
  for (let i = startNote; i <= endNote; i++) {
    if (!isBlackKey(i)) {
      keyPositions[i] = currentX;
      currentX += whiteKeyWidth;
    }
  }

  // Handle black key positions
  for (let i = startNote; i <= endNote; i++) {
    if (isBlackKey(i)) {
      let prevWhite = i - 1;
      keyPositions[i] = keyPositions[prevWhite] + (whiteKeyWidth - blackKeyWidth / 2);
    }
  }

  const totalWidth = currentX;

  // Auto-scroll to middle C (60) on mount if container exists
  useEffect(() => {
    if (containerRef.current) {
        // Center around C4 (60)
        const middleC = keyPositions[60];
        const containerWidth = containerRef.current.clientWidth;
        containerRef.current.scrollLeft = middleC - containerWidth / 2;
    }
  }, []);

  const whiteKeys = [];
  const blackKeys = [];

  for (let i = startNote; i <= endNote; i++) {
    const isActive = activeNotes.includes(i);
    const isBlack = isBlackKey(i);

    if (isBlack) {
      blackKeys.push(
        <rect
          key={i}
          x={keyPositions[i]}
          y={0}
          width={blackKeyWidth}
          height={height * 0.65}
          fill={isActive ? '#3b82f6' : '#1e293b'}
          rx={3}
          ry={3}
          className="transition-colors duration-75"
        />
      );
    } else {
      whiteKeys.push(
        <rect
          key={i}
          x={keyPositions[i]}
          y={0}
          width={whiteKeyWidth}
          height={height}
          fill={isActive ? '#bfdbfe' : 'white'}
          stroke="#e2e8f0"
          strokeWidth={1}
          rx={4}
          ry={4}
          className="transition-colors duration-75"
        />
      );
    }
  }

  return (
    <div className="w-full relative group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
               <span className={`w-2 h-2 rounded-full ${activeNotes.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
               MIDI Keyboard
             </span>
             {activeNotes.length > 0 && <span className="text-xs font-mono text-blue-600 font-bold">{activeNotes.length} keys active</span>}
        </div>
        <div 
            ref={containerRef}
            className="overflow-x-auto pb-2 custom-scrollbar"
        >
            <div className="p-2 min-w-min">
                <svg width={totalWidth} height={height} className="block">
                    {whiteKeys}
                    {blackKeys}
                </svg>
            </div>
        </div>
    </div>
  );
};

export default VirtualPiano;