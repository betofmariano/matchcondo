import { APP_DISPLAY_NAME } from '@/constants/app-branding';

export const WHATSAPP_SUPORTE_E164 = '5534984444500';

type WhatsAppSuporteContext = {
  clube?: string | null;
  nome?: string | null;
  telefone?: string | null;
};

export function buildWhatsAppSuporteMessage(context?: WhatsAppSuporteContext): string {
  const lines = [`Olá! Preciso de ajuda no aplicativo ${APP_DISPLAY_NAME}.`];
  const clube = context?.clube?.trim();
  const nome = context?.nome?.trim();
  const telefone = context?.telefone?.trim();

  if (clube) {
    lines.push(`Condomínio: ${clube}`);
  }

  if (nome) {
    lines.push(`Nome: ${nome}`);
  }

  if (telefone) {
    lines.push(`Telefone do login: ${telefone}`);
  }

  return lines.join('\n');
}

export function buildWhatsAppSuporteUrl(context?: WhatsAppSuporteContext): string {
  return `https://wa.me/${WHATSAPP_SUPORTE_E164}?text=${encodeURIComponent(
    buildWhatsAppSuporteMessage(context),
  )}`;
}
