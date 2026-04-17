import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks';
import { CollaborativePlaylistService } from '@/services';

interface PlaylistVersion {
  id: string;
  timestamp: number;
  userId: string;
  username: string;
  changes: PlaylistChange[];
}

interface PlaylistChange {
  type: 'add' | 'remove' | 'reorder' | 'edit';
  trackId?: string;
  index?: number;
  data?: any;
}

interface CollaboratorCursor {
  userId: string;
  username: string;
  trackIndex: number;
  color: string;
}

export const CollaborativePlaylistBuilder: React.FC<{ playlistId: string }> = ({
  playlistId,
}) => {
  const [playlist, setPlaylist] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorCursor[]>([]);
  const [versionHistory, setVersionHistory] = useState<PlaylistVersion[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [permissions, setPermissions] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const { socket } = useWebSocket();
  const service = new CollaborativePlaylistService();

  // Initialize playlist
  useEffect(() => {
    const loadPlaylist = async () => {
      const data = await service.getPlaylist(playlistId);
      setPlaylist(data);
      setPermissions(data.userPermission);
      setVersionHistory(data.history);
    };
    loadPlaylist();
  }, [playlistId]);

  // Real-time collaboration
  useEffect(() => {
    if (!socket) return;

    socket.on(`playlist:${playlistId}:track-added`, (data) => {
      setPlaylist((prev) => ({
        ...prev,
        tracks: [...prev.tracks, data.track],
      }));
      recordChange('add', { track: data.track });
    });

    socket.on(`playlist:${playlistId}:track-removed`, (data) => {
      setPlaylist((prev) => ({
        ...prev,
        tracks: prev.tracks.filter((t) => t.id !== data.trackId),
      }));
      recordChange('remove', { trackId: data.trackId });
    });

    socket.on(`playlist:${playlistId}:reordered`, (data) => {
      setPlaylist((prev) => ({
        ...prev,
        tracks: data.newOrder,
      }));
      recordChange('reorder', { newOrder: data.newOrder });
    });

    socket.on(`playlist:${playlistId}:cursor-update`, (data) => {
      setCollaborators((prev) => {
        const filtered = prev.filter((c) => c.userId !== data.userId);
        return [...filtered, data.cursor];
      });
    });

    socket.on(`playlist:${playlistId}:conflict-resolved`, (data) => {
      setPlaylist((prev) => ({
        ...prev,
        tracks: data.resolvedOrder,
      }));
    });

    return () => {
      socket.off(`playlist:${playlistId}:track-added`);
      socket.off(`playlist:${playlistId}:track-removed`);
      socket.off(`playlist:${playlistId}:reordered`);
      socket.off(`playlist:${playlistId}:cursor-update`);
      socket.off(`playlist:${playlistId}:conflict-resolved`);
    };
  }, [socket, playlistId]);

  const recordChange = useCallback(
    (type: string, data: any) => {
      socket?.emit(`playlist:${playlistId}:change`, {
        type,
        data,
        timestamp: Date.now(),
      });
    },
    [socket, playlistId]
  );

  const addTrack = async (trackId: string, index?: number) => {
    if (permissions === 'viewer') return;

    const track = await service.getTrackDetails(trackId);
    socket?.emit(`playlist:${playlistId}:add-track`, {
      track,
      index: index || playlist.tracks.length,
    });
  };

  const removeTrack = (index: number) => {
    if (permissions === 'viewer') return;

    socket?.emit(`playlist:${playlistId}:remove-track`, { index });
  };

  const reorderTracks = (fromIndex: number, toIndex: number) => {
    if (permissions === 'viewer') return;

    const newOrder = [...playlist.tracks];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);

    socket?.emit(`playlist:${playlistId}:reorder-tracks`, {
      fromIndex,
      toIndex,
      newOrder,
    });
  };

  const updateCursor = (trackIndex: number) => {
    socket?.emit(`playlist:${playlistId}:update-cursor`, {
      trackIndex,
    });
  };

  const getVersionDiff = (v1: PlaylistVersion, v2: PlaylistVersion) => {
    return service.computeDiff(v1, v2);
  };

  const restoreVersion = async (versionId: string) => {
    if (permissions !== 'owner') return;

    const restored = await service.restoreVersion(playlistId, versionId);
    setPlaylist(restored);
    socket?.emit(`playlist:${playlistId}:restored-version`, { versionId });
  };

  const sharePlaylist = async (permissions: 'editor' | 'viewer', emails: string[]) => {
    if (permissions !== 'owner') return;

    for (const email of emails) {
      await service.grantAccess(playlistId, email, permissions);
      socket?.emit(`playlist:${playlistId}:access-granted`, { email, permissions });
    }
  };

  return (
    <div className="collaborative-playlist-builder">
      <div className="header">
        <h2>{playlist?.name}</h2>
        <div className="collaborators">
          {collaborators.map((collab) => (
            <div
              key={collab.userId}
              className="cursor"
              style={{ borderLeftColor: collab.color }}
              title={collab.username}
            >
              {collab.username}
            </div>
          ))}
        </div>
      </div>

      <div className="actions">
        <button
          onClick={() => setIsEditing(!isEditing)}
          disabled={permissions === 'viewer'}
        >
          {isEditing ? 'Done Editing' : 'Edit'}
        </button>
        <button onClick={() => sharePlaylist('editor', [])}>
          Share as Editor
        </button>
        <button onClick={() => sharePlaylist('viewer', [])}>
          Share as Viewer
        </button>
      </div>

      <div className="playlist-content">
        <div className="tracks">
          {playlist?.tracks.map((track: any, index: number) => (
            <div
              key={track.id}
              className="track-item"
              draggable={isEditing}
              onDragEnd={(e) => reorderTracks(index, index + 1)}
              onMouseEnter={() => updateCursor(index)}
            >
              <span className="track-number">{index + 1}</span>
              <span className="track-name">{track.name}</span>
              <span className="artist">{track.artist}</span>
              {isEditing && (
                <button
                  onClick={() => removeTrack(index)}
                  className="remove-btn"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="version-history">
          <h3>Version History</h3>
          <div className="versions">
            {versionHistory.map((version) => (
              <div key={version.id} className="version-item">
                <div className="version-info">
                  <span>{version.username}</span>
                  <span>{new Date(version.timestamp).toLocaleString()}</span>
                </div>
                <div className="changes">
                  {version.changes.map((change, i) => (
                    <span key={i} className={`change-${change.type}`}>
                      {change.type}
                    </span>
                  ))}
                </div>
                {permissions === 'owner' && (
                  <button onClick={() => restoreVersion(version.id)}>
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .collaborative-playlist-builder {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 20px;
          padding: 20px;
        }

        .header {
          grid-column: 1 / -1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .collaborators {
          display: flex;
          gap: 8px;
        }

        .cursor {
          padding: 4px 8px;
          border-left: 3px solid;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-size: 12px;
        }

        .tracks {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .track-item {
          display: grid;
          grid-template-columns: 30px 1fr 1fr 30px;
          gap: 12px;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          cursor: grab;
        }

        .track-item:active {
          cursor: grabbing;
          opacity: 0.8;
        }

        .version-history {
          max-height: 400px;
          overflow-y: auto;
        }

        .version-item {
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .changes {
          display: flex;
          gap: 4px;
          margin: 4px 0;
        }

        .change-add { color: #4ade80; }
        .change-remove { color: #ef4444; }
        .change-reorder { color: #3b82f6; }
        .change-edit { color: #f59e0b; }
      `}</style>
    </div>
  );
};
