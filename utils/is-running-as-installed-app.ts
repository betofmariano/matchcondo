import { Platform } from 'react-native';

/**
 * App nativo ou PWA em display-mode standalone — a pessoa já não está no browser.
 */
export function isRunningAsInstalledApp(): boolean {
  if (Platform.OS !== 'web') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };

  if (navigatorWithStandalone.standalone === true) {
    return true;
  }

  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
}
