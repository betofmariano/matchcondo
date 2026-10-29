import { Linking } from 'react-native';

import { buildWhatsAppSuporteUrl } from '@/constants/whatsapp-suporte';

export const WHATSAPP_SUPORTE_OPEN_ERROR =
  'Não foi possível abrir o WhatsApp. Tente novamente pelo celular.';

type WhatsAppSuporteContext = {
  clube?: string | null;
  nome?: string | null;
  telefone?: string | null;
};

export async function openWhatsAppSuporte(context?: WhatsAppSuporteContext): Promise<boolean> {
  const url = buildWhatsAppSuporteUrl(context);

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
