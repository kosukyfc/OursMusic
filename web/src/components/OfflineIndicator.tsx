import { memo, useEffect, useState } from 'react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  syncProgress?: number;
}

export const OfflineIndicator = memo(function OfflineIndicator({
  isOnline,
  syncProgress,
}: OfflineIndicatorProps) {
  const [show, setShow] = useState(!isOnline);

  useEffect(() => {
    setShow(!isOnline);
  }, [isOnline]);

  if (show && !isOnline) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          borderRadius: 12,
          padding: 16,
          color: '#fff',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 1000,
          maxWidth: 300,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 20 }}>📡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              Modo Offline
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {syncProgress !== undefined
                ? `Sincronizando: ${syncProgress}%`
                : 'Você está offline. Tocando do cache...'}
            </div>
            {syncProgress !== undefined && (
              <div
                style={{
                  marginTop: 8,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 4,
                  height: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    height: '100%',
                    width: `${syncProgress}%`,
                    transition: 'width 0.2s',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
});
