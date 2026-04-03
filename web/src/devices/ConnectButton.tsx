import { useState } from 'react';
import type { DeviceInfo } from './useDevices';
import './ConnectButton.css';

interface Props {
  devices: DeviceInfo[];
  connected: boolean;
  onTransfer: (deviceId: string) => void;
}

const DEVICE_ICONS: Record<string, string> = {
  browser: '💻',
  mobile: '📱',
  speaker: '🔊',
  tv: '📺',
};

export function ConnectButton({ devices, connected, onTransfer }: Props) {
  const [open, setOpen] = useState(false);

  const currentDevice = devices.find(d => d.isMaster);
  const isActive = connected && devices.length > 0;

  return (
    <div className="cb-wrap">
      <button
        className={`cb-btn${isActive ? ' cb-btn--active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Conectar a um dispositivo"
      >
        {/* Speaker + screen icon — identical to Spotify */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
        </svg>
        {isActive && <span className="cb-dot" />}
      </button>

      {open && (
        <>
          <div className="cb-backdrop" onClick={() => setOpen(false)} />
          <div className="cb-modal">
            <div className="cb-modal__header">
              {isActive ? (
                <>
                  <div className="cb-modal__wave">
                    <span /><span /><span /><span />
                  </div>
                  <div>
                    <div className="cb-modal__title">Tocando em</div>
                    <div className="cb-modal__device-name">{currentDevice?.name ?? 'Este dispositivo'}</div>
                  </div>
                </>
              ) : (
                <div className="cb-modal__title">Dispositivos disponíveis</div>
              )}
            </div>

            <div className="cb-modal__list">
              {devices.length === 0 ? (
                <div className="cb-modal__empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#535353' }}>
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                  </svg>
                  <p>Nenhum outro dispositivo encontrado</p>
                  <span>Abra o app em outro dispositivo para conectar</span>
                </div>
              ) : (
                devices.map(device => (
                  <button
                    key={device.id}
                    className={`cb-device${device.isMaster ? ' cb-device--active' : ''}`}
                    onClick={() => { onTransfer(device.id); setOpen(false); }}
                  >
                    <span className="cb-device__icon">{DEVICE_ICONS[device.type] ?? '💻'}</span>
                    <div className="cb-device__info">
                      <span className="cb-device__name">{device.name}</span>
                      {device.isMaster && <span className="cb-device__playing">Tocando agora</span>}
                    </div>
                    {device.isMaster && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1db954">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
