import type { Academia, AcademiaRegulamento, AcademiaRegulamentoArquivo } from '@/types/academia';
import {
  normalizeBoolean,
  normalizeRecordId,
  readString,
} from '@/utils/normalize-api-fields';
import { normalizePermissoesGestorFromApi } from '@/utils/academia-permissoes-gestor';
import { normalizePermissoesProfessorFromApi } from '@/utils/academia-permissoes-professor';
import { normalizePermissoesUsuarioFromApi } from '@/utils/academia-permissoes-usuario';

function isAcademiaRegulamentoArquivo(value: unknown): value is AcademiaRegulamentoArquivo {
  return Boolean(value && typeof value === 'object' && ('url' in value || 'name' in value));
}

export function normalizeRegulamentoFromApi(value: unknown): AcademiaRegulamento {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (isAcademiaRegulamentoArquivo(value)) {
    return value;
  }

  return null;
}

export function readAcademiaRegulamentoLabel(regulamento: AcademiaRegulamento): string {
  return readAcademiaRegulamentoFileName(regulamento) ?? '';
}

export function readAcademiaRegulamentoFileName(regulamento: AcademiaRegulamento): string | null {
  if (typeof regulamento === 'string' && regulamento.trim()) {
    return regulamento.trim();
  }

  if (typeof regulamento === 'object' && regulamento != null) {
    if (regulamento.name?.trim()) {
      return regulamento.name.trim();
    }

    if (regulamento.url?.trim()) {
      return regulamento.url.split('/').pop()?.split('?')[0] ?? regulamento.url;
    }
  }

  return null;
}

export function readAcademiaRegulamentoUrl(regulamento: AcademiaRegulamento): string | null {
  if (typeof regulamento === 'string' && regulamento.trim()) {
    const trimmed = regulamento.trim();

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }

  if (typeof regulamento === 'object' && regulamento?.url?.trim()) {
    return regulamento.url.trim();
  }

  return null;
}

export function normalizeAcademiaFromApi(raw: unknown): Academia | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = normalizeRecordId(record.id);
  const nome = readString(record, ['nome']).trim();

  if (id == null || !nome) {
    return null;
  }

  const mensalSemana = normalizeBoolean(record.mensalSemana ?? record.modeloDamha);

  return {
    id,
    nome,
    logoUrl: readString(record, ['logoUrl']),
    tituloSocio: normalizeBoolean(
      record.tituloSocio ?? record.TituloSocio ?? record.titulo_socio,
    ),
    associacaoExigida: normalizeBoolean(record.AssociacaoExigida ?? record.associacaoExigida),
    temRegulamento: normalizeBoolean(record.temRegulamento),
    ativo: normalizeBoolean(record.ativo),
    complemento: normalizeBoolean(record.complemento ?? record.Complemento ?? record.exigeComplemento),
    semPublicidade: normalizeBoolean(record.semPublicidade),
    mensalSemana,
    permissoesGestor: normalizePermissoesGestorFromApi(
      record.permissoesGestor ?? record.permissoes_gestor,
    ),
    permissoesProfessor: normalizePermissoesProfessorFromApi(
      record.permissoesProfessor ?? record.permissoes_professor,
    ),
    permissoesUsuario: normalizePermissoesUsuarioFromApi(
      record.permissoesUsuario ?? record.permissoes_usuario,
    ),
    reservaSemana:
      typeof record.reservaSemana === 'number' && Number.isFinite(record.reservaSemana)
        ? record.reservaSemana
        : 0,
    regulamento: normalizeRegulamentoFromApi(record.regulamento),
  };
}

export function normalizeAcademiasFromApi(raw: unknown): Academia[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => normalizeAcademiaFromApi(item))
    .filter((item): item is Academia => item !== null);
}

export function filterActiveAcademias(academias: Academia[]): Academia[] {
  return academias.filter((academia) => academia.ativo);
}
