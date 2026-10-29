import { Platform } from 'react-native';

import { PASSWORD_LOGIN_INSTALL_PROMPT_SESSION_KEY } from '@/constants/storage-keys';

let pendingPasswordLoginInstallPrompt = false;

function canUseSessionStorage(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export function markPasswordLoginInstallPrompt(): void {
  pendingPasswordLoginInstallPrompt = true;

  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(PASSWORD_LOGIN_INSTALL_PROMPT_SESSION_KEY, '1');
  } catch {
    // Sessão em memória ainda cobre a navegação no mesmo carregamento.
  }
}

export function hasPasswordLoginInstallPrompt(): boolean {
  if (pendingPasswordLoginInstallPrompt) {
    return true;
  }

  if (!canUseSessionStorage()) {
    return false;
  }

  try {
    return window.sessionStorage.getItem(PASSWORD_LOGIN_INSTALL_PROMPT_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function consumePasswordLoginInstallPrompt(): void {
  pendingPasswordLoginInstallPrompt = false;

  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(PASSWORD_LOGIN_INSTALL_PROMPT_SESSION_KEY);
  } catch {
    // Ignora falha de storage; a flag em memória já foi limpa.
  }
}
