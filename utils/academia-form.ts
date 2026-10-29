import type {
  Academia,
  AcademiaFormFieldErrors,
  AcademiaFormValues,
  AcademiaRegulamento,
  UpdateAcademiaPayload,
} from '@/types/academia';

export const LOCAL_CONFIG_MESSAGES = {
  loadError: 'Não foi possível carregar os dados do local.',
  updateError: 'Não foi possível atualizar o local. Tente novamente.',
  updateSuccess: 'Configuração do local atualizada com sucesso.',
  permissionView: 'Você não tem permissão para configurar este local.',
  permissionSave: 'Você não tem permissão para alterar este local.',
  unsavedTitle: 'Alterações não salvas',
  unsavedMessage: 'Deseja sair sem salvar as alterações?',
  loadListError: 'Não foi possível carregar os locais.',
  regulamentoOpenError: 'Não foi possível abrir o regulamento.',
};

/** Exibe campos de complemento quando a academia exige (independente de mensalSemana). */
export function academiaExigeComplemento(academia: Academia | null | undefined): boolean {
  return academia?.complemento === true;
}

export function createEmptyAcademiaFormValues(): AcademiaFormValues {
  return {
    nome: '',
    logoUrl: '',
    tituloSocio: false,
    associacaoExigida: false,
    temRegulamento: false,
    ativo: true,
    complemento: false,
  };
}

export function academiaToFormValues(academia: Academia): AcademiaFormValues {
  return {
    nome: academia.nome,
    logoUrl: academia.logoUrl,
    tituloSocio: academia.tituloSocio,
    associacaoExigida: academia.associacaoExigida,
    temRegulamento: academia.temRegulamento,
    ativo: academia.ativo,
    complemento: academia.complemento,
  };
}

function resolveRegulamentoPayload(
  values: AcademiaFormValues,
  originalRegulamento?: AcademiaRegulamento,
): AcademiaRegulamento {
  if (!values.temRegulamento) {
    return null;
  }

  return originalRegulamento ?? null;
}

export function validateAcademiaForm(values: AcademiaFormValues): AcademiaFormFieldErrors {
  const errors: AcademiaFormFieldErrors = {};
  const nome = values.nome.trim();

  if (!nome) {
    errors.nome = 'Informe o nome do local.';
  }

  return errors;
}

export function buildUpdateAcademiaPayload(
  values: AcademiaFormValues,
  originalAcademia?: Academia | null,
): UpdateAcademiaPayload {
  return {
    nome: values.nome.trim(),
    logoUrl: originalAcademia?.logoUrl ?? values.logoUrl.trim(),
    tituloSocio: values.tituloSocio,
    associacaoExigida: values.associacaoExigida,
    temRegulamento: values.temRegulamento,
    ativo: values.ativo,
    complemento: values.complemento,
    regulamento: resolveRegulamentoPayload(values, originalAcademia?.regulamento),
  };
}

export function hasAcademiaFormChanges(
  current: AcademiaFormValues,
  original: AcademiaFormValues,
): boolean {
  return (
    current.nome !== original.nome ||
    current.tituloSocio !== original.tituloSocio ||
    current.associacaoExigida !== original.associacaoExigida ||
    current.temRegulamento !== original.temRegulamento ||
    current.ativo !== original.ativo ||
    current.complemento !== original.complemento
  );
}
