import type { Router } from 'expo-router';
import { Platform } from 'react-native';

/** Rota da home (tabs/index). */
export const HOME_ROUTE = '/(tabs)' as const;

export const LOGIN_ROUTE = '/login' as const;

function isAuthPath(pathname: string): boolean {
  return pathname.includes('/login') || pathname.includes('/signup');
}

function resolveWebHomeUrl(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return '/';
}

export type HomeNavigationParams = {
  loginSenha?: string;
};

function buildWebHomeUrl(params?: HomeNavigationParams): string {
  const baseUrl = resolveWebHomeUrl();

  if (params?.loginSenha !== '1') {
    return baseUrl;
  }

  return `${baseUrl}?loginSenha=1`;
}

/** Redireciona para a home após login ou cadastro. */
export function navigateToHome(
  router: Pick<Router, 'replace'>,
  params?: HomeNavigationParams,
): void {
  if (params?.loginSenha === '1') {
    router.replace({ pathname: HOME_ROUTE, params: { loginSenha: '1' } });
  } else {
    router.replace(HOME_ROUTE);
  }

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    if (isAuthPath(window.location.pathname)) {
      window.location.replace(buildWebHomeUrl(params));
    }
  });
}
