import type { AtividadeUnidade } from '@/types/atividade-unidade';
import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';

export type MapaAtividadeUnidadeTab = {
  id: number;
  label: string;
};

/**
 * Monta abas a partir dos itens do mapa com atividadeunidade_id preenchido.
 * Sem unidades (ou só uma) → lista vazia (UI sem abas).
 */
export function buildMapaAtividadeUnidadeTabs(
  horarios: Array<Pick<MapaDiarioFuturoItem, 'atividadeunidade_id' | 'atividadeUnidadeNome'>>,
  unidadesById?: Map<number, AtividadeUnidade> | null,
): MapaAtividadeUnidadeTab[] {
  const labels = new Map<number, string>();

  for (const item of horarios) {
    const unidadeId = item.atividadeunidade_id;

    if (unidadeId == null || unidadeId <= 0) {
      continue;
    }

    if (labels.has(unidadeId)) {
      continue;
    }

    const fromCadastro = unidadesById?.get(unidadeId)?.unidade?.trim();
    const fromMapa = item.atividadeUnidadeNome?.trim();
    const label = fromCadastro || fromMapa || `Unidade ${unidadeId}`;

    labels.set(unidadeId, label);
  }

  const tabs = [...labels.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  return tabs.length > 1 ? tabs : [];
}

export function filterMapaDiarioByAtividadeUnidade(
  horarios: MapaDiarioFuturoItem[],
  atividadeunidadeId: number | null,
): MapaDiarioFuturoItem[] {
  if (atividadeunidadeId == null || atividadeunidadeId <= 0) {
    return horarios;
  }

  return horarios.filter((item) => item.atividadeunidade_id === atividadeunidadeId);
}

export function resolveInitialAtividadeUnidadeTabId(
  tabs: MapaAtividadeUnidadeTab[],
  currentId: number | null,
): number | null {
  if (tabs.length === 0) {
    return null;
  }

  if (currentId != null && tabs.some((tab) => tab.id === currentId)) {
    return currentId;
  }

  return tabs[0]?.id ?? null;
}
