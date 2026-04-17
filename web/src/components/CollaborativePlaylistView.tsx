import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';

interface PlaylistUser {
  id: string;
  name: string;
  avatarUrl?: string;
  isEditing?: boolean;
}

interface CollaborativePlaylistViewProps {
  playlistId: string;
}

/**
 * Collaborative Playlist Component
 * Enables real-time multi-user editing with cursor tracking
 */
export const CollaborativePlaylistView = ({ playlistId }: CollaborativePlaylistViewProps) => {
  const [, setSocket] = useState<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<PlaylistUser[]>([]);
  // const [localUser, setLocalUser] = useState<PlaylistUser | null>(null);
  const [editingUsers, setEditingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(`${WS_URL}/playlists`, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to collaborative playlist');
      newSocket.emit('join_playlist', {
        playlistId,
        userId: localStorage.getItem('userId'),
      });
    });

    newSocket.on('user_joined', (data: PlaylistUser) => {
      console.log('User joined:', data);
      setCollaborators((prev) => [...prev, data]);
    });

    newSocket.on('user_left', (data: { userId: string }) => {
      setCollaborators((prev) => prev.filter((u) => u.id !== data.userId));
    });

    newSocket.on('user_editing', (data: { userId: string; editing: boolean }) => {
      setEditingUsers((prev) => {
        const newSet = new Set(prev);
        if (data.editing) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    newSocket.on('playlist_changed', (change: any) => {
      console.log('Playlist changed:', change);
      // Update UI with change
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_playlist', {
          playlistId,
          userId: localStorage.getItem('userId'),
        });
        newSocket.disconnect();
      }
    };
  }, [playlistId]);

  // const broadcastChange = useCallback(
  //   (action: string, payload: any) => {
  //     socket?.emit('playlist_change', {
  //       playlistId,
  //       action,
  //       payload,
  //       userId: localStorage.getItem('userId'),
  //       timestamp: new Date(),
  //     });
  //   },
  //   [socket, playlistId],
  // );

  // const handleAddSong = (songId: string) => {
  //   broadcastChange('add_song', { songId });
  // };

  // const handleRemoveSong = (songId: string) => {
  //   broadcastChange('remove_song', { songId });
  // };

  // const handleReorder = (songs: any[]) => {
  //   broadcastChange('reorder', { songs });
  // };

  return (
    <div className="collaborative-playlist">
      <div className="collaborators-bar">
        <h3>Collaborating with:</h3>
        <div className="collaborators-list">
          {collaborators.map((user) => (
            <div key={user.id} className="collaborator-badge">
              <img src={user.avatarUrl} alt={user.name} />
              <span>{user.name}</span>
              {editingUsers.has(user.id) && <span className="editing-indicator">Editing...</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="playlist-content">
        {/* Playlist songs and editing UI */}
      </div>
    </div>
  );
};

export default CollaborativePlaylistView;
