import { memo, useState } from 'react';

interface SongGiftingModalProps {
  songId: string;
  title: string;
  artist?: string;
  onClose: () => void;
  onSendGift: (recipientId: string, message: string) => void;
}

export const SongGiftingModal = memo(function SongGiftingModal({
  title,
  onClose,
  onSendGift,
}: Omit<SongGiftingModalProps, 'songId' | 'artist'>) {
  const [friendEmail, setFriendEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!friendEmail.trim()) return;
    onSendGift(friendEmail, message);
    setSent(true);
    setTimeout(() => {
      setFriendEmail('');
      setMessage('');
      setSent(false);
      onClose();
    }, 1500);
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
          background: 'linear-gradient(135deg, #1db954, #1aa34a)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ color: '#fff', margin: 0, marginBottom: 16, fontSize: 20 }}>
          🎁 Presentear: {title}
        </h2>

        {sent ? (
          <div style={{ textAlign: 'center', color: '#fff', padding: 20 }}>
            <p style={{ fontSize: 28, margin: '10px 0' }}>✨</p>
            <p style={{ fontSize: 16 }}>Presente enviado com sucesso!</p>
            <p style={{ fontSize: 12, opacity: 0.8 }}>
              {friendEmail} receberá uma notificação 📬
            </p>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="Email do amigo..."
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 12,
                border: 'none',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: 14,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />

            <textarea
              placeholder="Escreva uma mensagem... (opcional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 16,
                border: 'none',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: 14,
                minHeight: 80,
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: 10,
                  border: 'none',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={!friendEmail.trim()}
                style={{
                  flex: 1,
                  padding: 10,
                  border: 'none',
                  borderRadius: 8,
                  background: friendEmail.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                  color: '#1db954',
                  cursor: friendEmail.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Enviar 🎁
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
