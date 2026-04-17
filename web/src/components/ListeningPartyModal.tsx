import { memo, useState } from 'react';

interface PartyMember {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
}

interface ListeningPartyModalProps {
  partyCode: string;
  members: PartyMember[];
  onClose: () => void;
  onInvite: () => void;
  onVote: (songId: string) => void;
  nextSongCandidates?: Array<{ id: string; title: string; artist?: string; votes: number }>;
}

export const ListeningPartyModal = memo(function ListeningPartyModal({
  partyCode,
  members,
  onClose,
  onInvite,
  onVote,
  nextSongCandidates = [],
}: ListeningPartyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(partyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>🎉 Listening Party</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Party Code */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#c4b5fd', marginBottom: 8, fontWeight: 600 }}>
            CÓDIGO DA PARTY
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 12,
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
                textAlign: 'center',
              }}
            >
              {partyCode}
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                background: copied ? '#10b981' : '#1db954',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* Members */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#c4b5fd', marginBottom: 8, fontWeight: 600 }}>
            PARTICIPANTES ({members.length})
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  background: member.isHost
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : 'rgba(0,0,0,0.3)',
                  borderRadius: 8,
                  padding: 8,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {member.isHost && '👑'} {member.name.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Voting */}
        {nextSongCandidates.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: '#c4b5fd', marginBottom: 8, fontWeight: 600 }}>
              🗳️ PRÓXIMA MÚSICA (vote!)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nextSongCandidates.map((song) => (
                <button
                  key={song.id}
                  onClick={() => onVote(song.id)}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: 12,
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#fbbf24';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(251, 191, 36, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.3)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{song.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{song.artist}</div>
                  </div>
                  <div
                    style={{
                      background: '#1db954',
                      borderRadius: 20,
                      padding: '4px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    👍 {song.votes}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onInvite}
            style={{
              flex: 1,
              background: '#1db954',
              border: 'none',
              borderRadius: 8,
              padding: 12,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            📤 Convidar Amigos
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              padding: 12,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
});
