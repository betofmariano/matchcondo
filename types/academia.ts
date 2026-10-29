import type { PermissoesGestor } from '@/types/academia-permissoes-gestor';
import type { PermissoesProfessor } from '@/types/academia-permissoes-professor';
import type { PermissoesUsuario } from '@/types/academia-permissoes-usuario';

export type AcademiaRegulamentoArquivo = {
  access?: string;
  path?: string;
  name?: string;
  type?: string;
  size?: number;
  mime?: string;
  url?: string;
  meta?: Record<string, unknown>;
};

export type AcademiaRegulamento = string | AcademiaRegulamentoArquivo | null;

export type Academia = {
  id: number;
  nome: string;
  logoUrl: string;
  tituloSocio: boolean;
  associacaoExigida: boolean;
  temRegulamento: boolean;
  ativo: boolean;
  complemento: boolean;
  semPublicidade: boolean;
  mensalSemana: boolean;
  permissoesGestor: PermissoesGestor;
  permissoesProfessor: PermissoesProfessor;
  permissoesUsuario: PermissoesUsuario;
  reservaSemana: number;
  regulamento: AcademiaRegulamento;
};

export type AcademiaFormValues = {
  nome: string;
  logoUrl: string;
  tituloSocio: boolean;
  associacaoExigida: boolean;
  temRegulamento: boolean;
  ativo: boolean;
  complemento: boolean;
};

export type AcademiaFormFieldErrors = Partial<Record<keyof AcademiaFormValues, string>> & {
  general?: string;
};

export type UpdateAcademiaPayload = {
  nome: string;
  logoUrl: string;
  tituloSocio: boolean;
  associacaoExigida: boolean;
  temRegulamento: boolean;
  ativo: boolean;
  complemento: boolean;
  regulamento: AcademiaRegulamento;
};
