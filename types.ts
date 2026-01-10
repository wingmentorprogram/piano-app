export enum AppMode {
  HOME = 'HOME',
  LIVE_SESSION = 'LIVE_SESSION',
  SONG_ANALYSIS = 'SONG_ANALYSIS',
  LIBRARY = 'LIBRARY'
}

export interface ChordLyricPair {
  chord: string;
  lyric: string;
  timestamp: number;
}

export interface SongSection {
  type: 'Verse' | 'Chorus' | 'Bridge' | 'Riff' | 'Intro' | 'Outro' | 'General';
  content: string; // The lyrics/chords string for this section
}

export interface SongAnalysisResult {
  title: string;
  artist: string;
  key: string;
  chords: string[];
  sections: SongSection[]; // New structured format
  lyrics?: string; // Legacy fallback
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  data: SongAnalysisResult;
}

// Audio Utils Types
export interface BlobData {
  data: string;
  mimeType: string;
}