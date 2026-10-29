import { Platform } from 'react-native';

import { APP_DISPLAY_NAME } from '@/constants/app-branding';
import { WEB_APP_ORIGIN } from '@/constants/web-app';

export type GuiaInstalacaoId = 'android' | 'safari' | 'iphone-chrome';

export type GuiaInstalacaoStep = {
  path: string;
  title: string;
};

export type GuiaInstalacao = {
  id: GuiaInstalacaoId;
  label: string;
  description: string;
  steps: GuiaInstalacaoStep[];
};

export const GUIAS_INSTALACAO: GuiaInstalacao[] = [
  {
    id: 'android',
    label: 'Android (Chrome)',
    description: 'Instalar pelo Google Chrome no Android',
    steps: [
      { path: '/InstalarAndroid-p1.gif', title: 'Como instalar o app no Android' },
      { path: '/InstalarAndroid-p2.gif', title: `Abra o ${APP_DISPLAY_NAME} no Chrome` },
      { path: '/InstalarAndroid-p3.gif', title: 'Abra o menu e toque em Instalar' },
      { path: '/InstalarAndroid-p4.gif', title: 'Escolha Instalar' },
      { path: '/InstalarAndroid-p5.gif', title: 'Confirme a instalação' },
      { path: '/InstalarAndroid-p6.gif', title: 'Pronto — ícone na tela inicial' },
    ],
  },
  {
    id: 'safari',
    label: 'iPhone (Safari)',
    description: 'Instalar pelo Safari no iPhone',
    steps: [
      { path: '/InstalarSafari-p1.gif', title: 'Como instalar o app no iPhone com Safari' },
      { path: '/InstalarSafari-p2.gif', title: `Abra o ${APP_DISPLAY_NAME} no Safari` },
      { path: '/InstalarSafari-p3.gif', title: 'Toque no botão de compartilhar' },
      { path: '/InstalarSafari-p4.gif', title: 'Escolha Adicionar à Tela de Início' },
      { path: '/InstalarSafari-p5.gif', title: 'Confirme Adicionar' },
      { path: '/InstalarSafari-p6.gif', title: 'Confirme a instalação' },
      { path: '/InstalarSafari-p7.gif', title: 'Pronto — ícone na tela inicial' },
    ],
  },
  {
    id: 'iphone-chrome',
    label: 'iPhone (Chrome)',
    description: 'Instalar pelo Google Chrome no iPhone',
    steps: [
      { path: '/InstalariPhoneG-p1.gif', title: 'Como instalar o app no iPhone com Chrome' },
      { path: '/InstalariPhoneG-p2.gif', title: `Abra o ${APP_DISPLAY_NAME} no Chrome` },
      { path: '/InstalariPhoneG-p3.gif', title: 'Abra o menu de compartilhar' },
      { path: '/InstalariPhoneG-p4.gif', title: 'Escolha Adicionar à Tela de Início' },
      { path: '/InstalariPhoneG-p5.gif', title: 'Confirme a instalação' },
      { path: '/InstalariPhoneG-p6.gif', title: 'Pronto — ícone na tela inicial' },
    ],
  },
];

export function getGuiaInstalacaoById(id: GuiaInstalacaoId): GuiaInstalacao | null {
  return GUIAS_INSTALACAO.find((guia) => guia.id === id) ?? null;
}

export function getGuiaInstalacaoStepUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  return `${WEB_APP_ORIGIN}${path}`;
}
