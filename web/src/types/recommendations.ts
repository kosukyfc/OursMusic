export interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  similarity: number; // 0-1
  reason: string;
}

export interface SongLyrics {
  id: string;
  title: string;
  artist: string;
  lyrics: Lyric[];
  provider: 'genius' | 'musixmatch' | 'cached';
  syncedAt?: Date;
}

export interface Lyric {
  time: number;
  text: string;
}

export interface PlaylistCollaboration {
  id: string;
  playlistId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'rejected';
  invitedBy: string;
  createdAt: Date;
}

export interface CollaborativePlaylistUser {
  id: string;
  name: string;
  avatarUrl?: string;
  isEditing: boolean;
}
