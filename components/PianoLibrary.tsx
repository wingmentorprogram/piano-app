import React, { useState, useEffect, useRef } from 'react';
import { Network, ZoomIn, ZoomOut, Info, Download, Upload, Music, User, Calendar, FileJson } from 'lucide-react';
import { HistoryItem } from '../types';

interface Node {
  id: string;
  label: string;
  type: 'root' | 'artist' | 'song';
  x: number;
  y: number;
  r: number;
  data?: any; // Holds the full song data or artist stats
  connections: string[];
}

const PianoLibrary: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and calculate graph
  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = () => {
    const saved = localStorage.getItem('songHistory');
    if (!saved) {
      setNodes([{ id: 'root', label: 'My Playlist', type: 'root', x: 400, y: 300, r: 50, connections: [] }]);
      return;
    }

    try {
      const history: HistoryItem[] = JSON.parse(saved);
      const groupedByArtist: Record<string, HistoryItem[]> = {};

      // Group by Artist
      history.forEach(item => {
        const artist = item.data.artist || 'Unknown Artist';
        if (!groupedByArtist[artist]) groupedByArtist[artist] = [];
        groupedByArtist[artist].push(item);
      });

      const newNodes: Node[] = [];
      const rootX = 400;
      const rootY = 300;

      // 1. Root Node
      newNodes.push({
        id: 'root',
        label: 'My Playlist',
        type: 'root',
        x: rootX,
        y: rootY,
        r: 60,
        connections: Object.keys(groupedByArtist).map(artist => `artist-${artist}`)
      });

      // 2. Artist Nodes (Orbit 1)
      const artists = Object.keys(groupedByArtist);
      const artistRadius = 250;
      const anglePerArtist = (2 * Math.PI) / (artists.length || 1);

      artists.forEach((artist, i) => {
        const angle = i * anglePerArtist;
        const aX = rootX + artistRadius * Math.cos(angle);
        const aY = rootY + artistRadius * Math.sin(angle);
        const artistId = `artist-${artist}`;

        newNodes.push({
          id: artistId,
          label: artist,
          type: 'artist',
          x: aX,
          y: aY,
          r: 40,
          data: { count: groupedByArtist[artist].length },
          connections: ['root'] // Connection handled by lines logic, but good for ref
        });

        // 3. Song Nodes (Orbit 2 - Fan out from Artist)
        const songs = groupedByArtist[artist];
        const songRadius = 100;
        // Spread songs in a semi-circle pointing away from center
        const songSpread = Math.PI / 2; // 90 degrees spread
        const startAngle = angle - songSpread / 2;
        const angleStep = songs.length > 1 ? songSpread / (songs.length - 1) : 0;

        songs.forEach((song, j) => {
          // If only 1 song, place it directly outward. Otherwise fan.
          const sAngle = songs.length === 1 ? angle : startAngle + (j * angleStep);
          
          newNodes.push({
            id: `song-${song.id}`,
            label: song.data.title.length > 15 ? song.data.title.substring(0, 15) + '...' : song.data.title,
            type: 'song',
            x: aX + songRadius * Math.cos(sAngle),
            y: aY + songRadius * Math.sin(sAngle),
            r: 25,
            data: song,
            connections: [artistId]
          });
        });
      });

      setNodes(newNodes);
    } catch (e) {
      console.error("Failed to parse history for library", e);
    }
  };

  const handleDownload = () => {
    const saved = localStorage.getItem('songHistory');
    if (!saved) return;
    const blob = new Blob([saved], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pianomuse-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          // Validate basic structure (optional but good)
          localStorage.setItem('songHistory', json);
          loadGraph(); // Refresh UI
          alert("Library imported successfully!");
        } else {
          alert("Invalid library file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse library file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const renderLines = () => {
    // We only need to draw lines from Child -> Parent to avoid duplicates
    // Or iterate nodes and draw to their defined connections
    // Since our structure defines connections in a specific way:
    // Root points to Artists. Songs point to Artists.
    // Let's iterate all nodes and draw lines to their connections that exist in nodes array.
    
    // Actually, simpler: Iterate nodes. If node type is song, draw to its artist. 
    // If node type is artist, draw to root.
    return nodes.map(node => {
        if (node.type === 'root') return null;
        
        let parentId = '';
        if (node.type === 'song') parentId = node.connections[0];
        if (node.type === 'artist') parentId = 'root';

        const parent = nodes.find(n => n.id === parentId);
        if (!parent) return null;

        return (
          <line
            key={`${node.id}-${parent.id}`}
            x1={node.x}
            y1={node.y}
            x2={parent.x}
            y2={parent.y}
            stroke="#cbd5e1"
            strokeWidth={node.type === 'artist' ? 3 : 1.5}
            opacity="0.6"
          />
        );
    });
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'root': return '#f43f5e'; // Rose
      case 'artist': return '#3b82f6'; // Blue
      case 'song': return '#10b981'; // Emerald
      default: return '#94a3b8';
    }
  };

  const getNodeIcon = (type: string) => {
      switch (type) {
        case 'root': return <Network size={32} color="white" />;
        case 'artist': return <User size={20} color="white" />;
        case 'song': return <Music size={14} color="white" />;
        default: return null;
      }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-4 overflow-hidden animate-fade-in">
      {/* Mindmap Canvas */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 relative overflow-hidden group shadow-inner">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 shadow-sm"><ZoomIn size={20} /></button>
          <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 shadow-sm"><ZoomOut size={20} /></button>
        </div>

        <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-200 text-xs font-bold shadow-sm">
                <Download size={16} /> Save Library
            </button>
            <button onClick={handleUploadClick} className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 border border-slate-200 text-xs font-bold shadow-sm">
                <Upload size={16} /> Load Library
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".json" 
                className="hidden" 
            />
        </div>

        <svg 
          viewBox="0 0 800 600" 
          className="w-full h-full cursor-move"
          style={{ transform: `scale(${scale})`, transition: 'transform 0.3s ease-out' }}
        >
          <defs>
             <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
             </filter>
          </defs>
          <g>
            {renderLines()}
            
            {nodes.map(node => (
              <g 
                key={node.id} 
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer transition-all duration-300"
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              >
                <circle 
                  cx={node.x} 
                  cy={node.y} 
                  r={node.r} 
                  fill={getNodeColor(node.type)} 
                  className="hover:brightness-110 transition-all shadow-md"
                  filter={selectedNode?.id === node.id ? 'url(#glow)' : ''}
                  stroke={selectedNode?.id === node.id ? '#1e293b' : 'white'}
                  strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                />
                
                {/* Icons centered in circles */}
                <foreignObject x={node.x - (node.type === 'root' ? 16 : node.type === 'artist' ? 10 : 7)} y={node.y - (node.type === 'root' ? 16 : node.type === 'artist' ? 10 : 7)} width={node.r*2} height={node.r*2} className="pointer-events-none">
                    {getNodeIcon(node.type)}
                </foreignObject>

                {/* Labels */}
                <text 
                  x={node.x} 
                  y={node.y + node.r + 15} 
                  textAnchor="middle" 
                  fill="#475569" 
                  fontSize={node.type === 'root' ? 16 : 12} 
                  fontWeight="bold"
                  className="pointer-events-none select-none drop-shadow-sm bg-white"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {nodes.length <= 1 && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 text-center pointer-events-none">
                <p>No songs found.</p>
                <p className="text-sm">Go to Studio to analyze YouTube links!</p>
             </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="w-full md:w-80 bg-white rounded-xl border border-slate-200 p-6 shadow-xl flex flex-col">
        <div className="flex items-center gap-2 mb-6 text-slate-400 uppercase tracking-wider text-xs font-bold">
          <Info size={14} /> Node Details
        </div>
        
        {selectedNode ? (
          <div className="animate-fade-in space-y-4">
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">{selectedNode.label}</h3>
            <div className={`w-full h-1 bg-gradient-to-r mb-4 ${
                selectedNode.type === 'root' ? 'from-rose-500' : 
                selectedNode.type === 'artist' ? 'from-blue-500' : 'from-emerald-500'
            } to-transparent`}></div>
            
            {selectedNode.type === 'root' && (
                <p className="text-slate-600">This is your personal music library. It grows as you analyze more songs in the Studio.</p>
            )}

            {selectedNode.type === 'artist' && (
                <div className="space-y-2">
                    <p className="text-slate-600">Artist</p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-2xl font-bold text-slate-800">{selectedNode.data.count}</span>
                        <span className="text-xs text-slate-500 uppercase font-bold">Songs in Library</span>
                    </div>
                </div>
            )}

            {selectedNode.type === 'song' && selectedNode.data && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Calendar size={14} />
                        <span>Played: {new Date(selectedNode.data.timestamp).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Key</h4>
                        <p className="text-xl font-bold text-slate-800">{selectedNode.data.data.key}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                         <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Chords</h4>
                         <div className="flex flex-wrap gap-1">
                            {selectedNode.data.data.chords.map((c: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded text-xs font-mono">
                                    {c}
                                </span>
                            ))}
                         </div>
                    </div>
                </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
            <FileJson size={48} className="mb-4 opacity-30" />
            <p>Select a node to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PianoLibrary;