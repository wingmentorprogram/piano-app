export enum AppMode {
  LANDING = 'LANDING',
  LIVE_SESSION = 'LIVE_SESSION',
  CHORD_GENERATOR = 'CHORD_GENERATOR',
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
  startTime?: string; // e.g. "0:45"
}

export interface SongAnalysisResult {
  title: string;
  artist: string;
  key: string;
  chords: string[];
  sections: SongSection[]; // New structured format
  lyrics?: string; // Legacy fallback
  videoId?: string; // Optional YouTube Video ID
  spotifyId?: string; // Optional Spotify Track ID
  musescoreUrl?: string; // Optional MuseScore Embed URL
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

export type Instrument = 'PIANO' | 'GUITAR';
export type Preference = 'SHEET' | 'CHORDS';
