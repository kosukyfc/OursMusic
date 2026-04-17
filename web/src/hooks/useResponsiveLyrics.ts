/**
 * Hook React para responsividade do sistema de lyrics
 * Adapta layout, tamanho de fonte e componentes conforme dispositivo
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LyricsResponsiveConfig,
  Platform,
  DeviceInfo,
} from '../types/lyrics';

/**
 * Detecta plataforma/SO
 */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;

  if (/android/i.test(ua)) {
    return Platform.ANDROID;
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return /ipad/i.test(ua) ? Platform.TABLET : Platform.IOS;
  }
  if (/macintosh/i.test(ua)) {
    return Platform.MACOS;
  }
  if (/windows/i.test(ua)) {
    return Platform.WINDOWS;
  }
  if (/linux/i.test(ua)) {
    return Platform.LINUX;
  }

  return Platform.WEB;
}

/**
 * Detecta informações do dispositivo
 */
function detectDeviceInfo(): DeviceInfo {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenDensity = window.devicePixelRatio || 1;
  const platform = detectPlatform();

  // Detecta notch (viewport-fit)
  const hasNotch = CSS.supports('padding', 'max(0px)');

  // Detecta safe area
  const isSafeAreaAware =
    CSS.supports('padding', 'env(safe-area-inset-top)') ||
    hasNotch;

  // Detecta touch
  const supportsTouchInput =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0;

  // Detecta haptic feedback
  const supportsHapticFeedback =
    'vibrate' in navigator ||
    platform === Platform.IOS;

  // Detecta PWA
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  return {
    platform,
    screenWidth,
    screenHeight,
    screenDensity,
    hasNotch,
    isSafeAreaAware,
    supportsTouchInput,
    supportsHapticFeedback,
    isPWA,
  };
}

/**
 * Categoriza tamanho de tela
 */
export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'tv';

function getScreenSize(width: number, height: number): ScreenSize {
  const isPortrait = height > width;
  const shortestSide = Math.min(width, height);

  // Smart TV (landscape muito largo)
  if (!isPortrait && width > 2000) {
    return 'tv';
  }

  // Smartwatch (muito pequeno)
  if (shortestSide < 300) {
    return 'mobile';
  }

  // Tablet (600+ pixels no lado curto, e portrait ou landscape)
  if (shortestSide >= 600) {
    return 'tablet';
  }

  // Smartphone (< 600 pixels no lado curto)
  if (shortestSide < 600) {
    return 'mobile';
  }

  // Desktop (padrão)
  return 'desktop';
}

/**
 * Calcula configuração de responsividade baseada em tamanho de tela
 */
function calculateResponsiveConfig(
  deviceInfo: DeviceInfo,
  screenSize: ScreenSize
): LyricsResponsiveConfig {
  const { screenWidth, screenHeight } = deviceInfo;

  switch (screenSize) {
    case 'mobile': {
      return {
        currentVerseFontSize: 24,
        nextVerseFontSize: 18,
        containerHeight: 80,
        layoutMode: 'vertical',
        albumArtSize: 120,
        showAlbumArt: true,
        showPlayerControls: true,
        showArtistInfo: false,
        orientation: screenHeight > screenWidth ? 'portrait' : 'landscape',
      };
    }

    case 'tablet': {
      const isPortrait = screenHeight > screenWidth;
      return {
        currentVerseFontSize: 32,
        nextVerseFontSize: 24,
        containerHeight: isPortrait ? 70 : 85,
        layoutMode: isPortrait ? 'vertical' : 'horizontal',
        albumArtSize: 200,
        showAlbumArt: true,
        showPlayerControls: true,
        showArtistInfo: true,
        orientation: isPortrait ? 'portrait' : 'landscape',
      };
    }

    case 'desktop': {
      return {
        currentVerseFontSize: 48,
        nextVerseFontSize: 36,
        containerHeight: 100,
        layoutMode: 'horizontal',
        albumArtSize: 300,
        showAlbumArt: true,
        showPlayerControls: true,
        showArtistInfo: true,
        orientation: 'landscape',
      };
    }

    case 'tv': {
      return {
        currentVerseFontSize: 64,
        nextVerseFontSize: 48,
        containerHeight: 100,
        layoutMode: 'horizontal',
        albumArtSize: 400,
        showAlbumArt: true,
        showPlayerControls: false,
        showArtistInfo: true,
        orientation: 'landscape',
      };
    }

    default:
      return {
        currentVerseFontSize: 24,
        nextVerseFontSize: 18,
        containerHeight: 80,
        layoutMode: 'vertical',
        albumArtSize: 120,
        showAlbumArt: true,
        showPlayerControls: true,
        showArtistInfo: false,
        orientation: 'portrait',
      };
  }
}

/**
 * Media Query breakpoints
 */
const BREAKPOINTS = {
  mobile: 0,
  tablet: 600,
  desktop: 1024,
  tv: 2560,
} as const;

export interface UseResponsiveLyricsProps {
  /** Escala customizada de font sizes (multiplicador) */
  fontScale?: number;
  /** Callback quando tamanho de tela muda */
  onScreenSizeChange?: (screenSize: ScreenSize) => void;
  /** Callback quando dispositivo muda */
  onDeviceChange?: (deviceInfo: DeviceInfo) => void;
  /** Abilita debug logging */
  debug?: boolean;
}

export interface UseResponsiveLyricsReturn {
  /** Informações do dispositivo */
  deviceInfo: DeviceInfo;
  /** Categoria de tamanho de tela */
  screenSize: ScreenSize;
  /** Configuração responsiva calculada */
  responsiveConfig: LyricsResponsiveConfig;
  /** Se deve rotacionar conteúdo */
  isPortrait: boolean;
  /** Se é dispositivo móvel pequeno */
  isSmallMobile: boolean;
  /** Se é smartwatch */
  isSmartwatch: boolean;
  /** Se é Smart TV */
  isSmartTV: boolean;
  /** Classe CSS para aplicar */
  htmlClassName: string;
  /** CSS variables para responsive design */
  cssVariables: Record<string, string>;
}

/**
 * Hook para responsividade de lyrics
 */
export function useResponsiveLyrics({
  fontScale = 1,
  onScreenSizeChange,
  onDeviceChange,
  debug = false,
}: UseResponsiveLyricsProps = {}): UseResponsiveLyricsReturn {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(detectDeviceInfo);
  const [screenSize, setScreenSize] = useState<ScreenSize>(
    getScreenSize(deviceInfo.screenWidth, deviceInfo.screenHeight)
  );

  const responsiveConfig = useMemo(
    () => calculateResponsiveConfig(deviceInfo, screenSize),
    [deviceInfo, screenSize]
  );

  // Atualiza ao redimensionar
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newDeviceInfo = detectDeviceInfo();
        const newScreenSize = getScreenSize(
          newDeviceInfo.screenWidth,
          newDeviceInfo.screenHeight
        );

        if (newScreenSize !== screenSize) {
          setScreenSize(newScreenSize);
          if (onScreenSizeChange) {
            onScreenSizeChange(newScreenSize);
          }
        }

        if (
          newDeviceInfo.screenWidth !== deviceInfo.screenWidth ||
          newDeviceInfo.screenHeight !== deviceInfo.screenHeight
        ) {
          setDeviceInfo(newDeviceInfo);
          if (onDeviceChange) {
            onDeviceChange(newDeviceInfo);
          }
        }

        if (debug) {
          console.debug(
            `[ResponsiveLyrics] Resize: ${newDeviceInfo.screenWidth}x${newDeviceInfo.screenHeight}`,
            `Screen: ${newScreenSize}`
          );
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [deviceInfo, screenSize, onScreenSizeChange, onDeviceChange, debug]);

  // Aplica meta viewport para safe area
  useEffect(() => {
    if (!deviceInfo.isSafeAreaAware) return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover'
      );
    }
  }, [deviceInfo.isSafeAreaAware]);

  // Detecta smartwatch
  const isSmartwatch = deviceInfo.screenWidth < 300;

  // Detecta Smart TV
  const isSmartTV = screenSize === 'tv';

  // Detecta small mobile
  const isSmallMobile =
    screenSize === 'mobile' && deviceInfo.screenWidth < 400;

  // Orientação
  const isPortrait = deviceInfo.screenHeight > deviceInfo.screenWidth;

  // Classe CSS
  const htmlClassName = `
    lyrics-display
    device-${deviceInfo.platform}
    screen-${screenSize}
    ${isPortrait ? 'portrait' : 'landscape'}
    ${isSmartwatch ? 'smartwatch' : ''}
    ${isSmartTV ? 'smart-tv' : ''}
    ${deviceInfo.isPWA ? 'pwa' : ''}
    ${deviceInfo.supportsTouchInput ? 'touch' : 'no-touch'}
    density-${Math.round(deviceInfo.screenDensity)}x
  `.replace(/\s+/g, ' ');

  // CSS variables para responsive
  const cssVariables = {
    '--lyrics-font-size-current': `${responsiveConfig.currentVerseFontSize * fontScale}px`,
    '--lyrics-font-size-next': `${responsiveConfig.nextVerseFontSize * fontScale}px`,
    '--lyrics-container-height': `${responsiveConfig.containerHeight}vh`,
    '--lyrics-album-art-size': `${responsiveConfig.albumArtSize}px`,
    '--lyrics-screen-size': screenSize,
    '--device-pixel-ratio': `${deviceInfo.screenDensity}`,
    '--safe-area-inset-top': 'env(safe-area-inset-top, 0px)',
    '--safe-area-inset-bottom': 'env(safe-area-inset-bottom, 0px)',
    '--safe-area-inset-left': 'env(safe-area-inset-left, 0px)',
    '--safe-area-inset-right': 'env(safe-area-inset-right, 0px)',
  };

  return {
    deviceInfo,
    screenSize,
    responsiveConfig,
    isPortrait,
    isSmallMobile,
    isSmartwatch,
    isSmartTV,
    htmlClassName,
    cssVariables: cssVariables as Record<string, string>,
  };
}
