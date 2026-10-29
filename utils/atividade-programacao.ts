import type { Atividade } from '@/types/atividade';
import { normalizeTipoProgramacao } from '@/utils/atividade-form';

export type AtividadePadrao = 'Diaria' | 'Semanal' | 'MensalPorSemana';

const DIA_SEMANA_LABELS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

/**
 * Tipo vazio ou desconhecido permanece MensalPorSemana, para os espaços já em uso.
 * `diaria` e `semanal` seguem `atividade.tipoProgramacao`.
 */
export function resolveAtividadePadrao(
  tipoProgramacao?: string | null,
): AtividadePadrao {
  const normalized = normalizeTipoProgramacao(tipoProgramacao);

  if (normalized === 'semanal') {
    return 'Semanal';
  }

  if (normalized === 'diaria') {
    return 'Diaria';
  }

  return 'MensalPorSemana';
}

export function atividadeUsaMensalPorSemana(
  atividade?: { tipoProgramacao?: string | null } | null,
): boolean {
  return resolveAtividadePadrao(atividade?.tipoProgramacao) === 'MensalPorSemana';
}

export function resolveUsaMensalPorSemana(params?: {
  atividade?: Pick<Atividade, 'tipoProgramacao'> | { tipoProgramacao?: string | null } | null;
}): boolean {
  return atividadeUsaMensalPorSemana(params?.atividade);
}

/** Mesma escala de `toDiaSemanaApi`: 1 = segunda … 7 = domingo. */
export function formatDiaSemanaLabel(diaSemana: number | null | undefined): string {
  if (diaSemana == null || diaSemana < 1 || diaSemana > 7) {
    return 'Dia não informado';
  }

  return DIA_SEMANA_LABELS[diaSemana - 1];
}

export function formatHoraMinutos(hora: number, minutos: number): string {
  const horasLabel = String(Math.max(0, hora)).padStart(2, '0');
  const minutosLabel = String(Math.max(0, minutos)).padStart(2, '0');

  return `${horasLabel}:${minutosLabel}`;
}

/** Limite semanal do associado: só `atividade.limiteReservasSemana` (> 0). */
export function resolveLimiteReservasSemana(params: {
  atividade?: Pick<Atividade, 'limiteReservasSemana'> | { limiteReservasSemana?: number | null } | null;
}): number | null {
  const fromAtividade = params.atividade?.limiteReservasSemana;

  if (typeof fromAtividade === 'number' && Number.isFinite(fromAtividade) && fromAtividade > 0) {
    return fromAtividade;
  }

  return null;
}

export function academiaOfereceMensalPorSemana(params?: {
  atividades?: Array<Pick<Atividade, 'tipoProgramacao'> | { tipoProgramacao?: string | null }> | null;
}): boolean {
  const atividades = params?.atividades ?? [];

  if (atividades.length === 0) {
    return true;
  }

  return atividades.some((atividade) => atividadeUsaMensalPorSemana(atividade));
}
