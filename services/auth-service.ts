import { ASSOCIACAO_LOCAL_LABELS } from '@/constants/associacao-local-labels';
import { API_ENDPOINTS, buildGetUserPath, buildPesquisarUsuarioPath, XANO_API_BASE_URL } from '@/constants/api';
import { normalizeLoginPassword, normalizePhoneForApi } from '@/constants/auth';
import { ApiError, authGetRequest, authPatchRequest, getRequest, postRequest } from '@/services/api-client';
import type {
  AlterarPasswordUserRequest,
  AlterarSenhaAutenticadaResponse,
  AlterarSenhaRecuperacaoResponse,
  ConsultarRecuperacaoResponse,
  SolicitarRecuperacaoResponse,
  ValidarRecuperacaoResponse,
} from '@/types/password-recovery';
import type {
  EsqueceuCadastroResponse,
  EsqueceuCadastroUsuarioMatch,
} from '@/types/account-recovery';
import {
  normalizeEsqueceuCadastroUsuarios,
} from '@/utils/normalize-esqueceu-cadastro';
import {
  resolveSignupCondominioId,
  SIGNUP_CONDOMINIO_REQUIRED_MESSAGE,
  type SignupFoneRequest,
  type SignupFoneResponse,
} from '@/types/signup';
import { extractAuthToken } from '@/utils/auth-token';
import { extractPhotoUrlFromApiPayload } from '@/utils/user-photo';
import { normalizeUserFromApi } from '@/utils/normalize-user';
import { SIGNUP_FORM_FIELDS } from '@/constants/user-photo-form';
import {
  appendPhotoUploadToFormData,
  createMultipartFormData,
  postMultipartFormData,
} from '@/utils/photo-upload-form-data';
import type { User } from '@/types/user';

export type LoginRequest = {
  telefoneLimpo: string;
  password: string;
};

export type LoginResponse = {
  authToken?: string;
  /** Resposta do `/auth/login-safe`. */
  senhaCorreta?: boolean;
  encontrado?: boolean;
  totalEncontrado?: number;
  /** telefone | senha_vazia | sem_senha | senha | token */
  codigoErro?: string | null;
  /** Legado — mantido durante a migração. */
  sucesso?: boolean;
  foto?: string;
};

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message;
  }

  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error;
  }

  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail;
  }

  return null;
}

function toBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1) {
    return true;
  }

  if (value === false || value === 'false' || value === 0) {
    return false;
  }

  return undefined;
}

function normalizeRecordId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getPasswordRecoveryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message === 'Não foi possível conectar ao servidor. Tente novamente.') {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }

    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível concluir a operação. Tente novamente.';
}

export const SIGNUP_DUPLICATE_PHONE_MESSAGE =
  'Já existe uma conta com este telefone. Faça login ou use outro número.';

function readSignupErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const code = (payload as Record<string, unknown>).code;

  return typeof code === 'string' ? code : null;
}

function isDuplicatePhoneSignupMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('conta com esse telefone') ||
    normalized.includes('conta com este telefone') ||
    normalized.includes('already registered') ||
    normalized.includes('already in use') ||
    normalized.includes('account is already') ||
    normalized.includes('phone already')
  ) {
    return true;
  }

  if (!normalized.includes('telefone') && !normalized.includes('phone')) {
    return (
      normalized.includes('already exists') ||
      normalized.includes('duplicate') ||
      normalized.includes('unique constraint') ||
      normalized.includes('já existe') ||
      normalized.includes('ja existe')
    );
  }

  return (
    normalized.includes('cadastr') ||
    normalized.includes('exist') ||
    normalized.includes('duplic') ||
    normalized.includes('unique') ||
    normalized.includes('utiliz') ||
    normalized.includes('already') ||
    normalized.includes('já') ||
    normalized.includes('ja ')
  );
}

function readSignupErrorParam(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (
    record.payload &&
    typeof record.payload === 'object' &&
    typeof (record.payload as Record<string, unknown>).param === 'string'
  ) {
    return (record.payload as Record<string, unknown>).param as string;
  }

  return null;
}

function parseSignupFoneError(payload: unknown, status: number): string {
  const param = readSignupErrorParam(payload);

  if (param === 'Foto' || param === 'fotoUpload') {
    return 'Não foi possível enviar sua foto. Selecione outra imagem e tente novamente.';
  }

  if (param === 'telefoneLimpo' || param === 'telefone') {
    return SIGNUP_DUPLICATE_PHONE_MESSAGE;
  }

  const apiMessage = extractErrorMessage(payload);
  const errorCode = readSignupErrorCode(payload);

  if (
    errorCode === 'ERROR_CODE_ACCESS_DENIED' &&
    apiMessage &&
    isDuplicatePhoneSignupMessage(apiMessage)
  ) {
    return SIGNUP_DUPLICATE_PHONE_MESSAGE;
  }

  if (apiMessage && isDuplicatePhoneSignupMessage(apiMessage)) {
    return SIGNUP_DUPLICATE_PHONE_MESSAGE;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const sucesso = toBoolean(record.sucesso);

    if (sucesso === false && apiMessage && isDuplicatePhoneSignupMessage(apiMessage)) {
      return SIGNUP_DUPLICATE_PHONE_MESSAGE;
    }
  }

  if (apiMessage) {
    const normalized = apiMessage.toLowerCase();

    if (
      normalized.includes('missing file resource') ||
      normalized.includes('foto') ||
      normalized.includes('upload') ||
      normalized.includes('image') ||
      normalized.includes('arquivo')
    ) {
      return 'Não foi possível enviar sua foto. Tente novamente.';
    }

    if (normalized.includes('bloquead')) {
      return ASSOCIACAO_LOCAL_LABELS.cadastroBloqueado;
    }

    if (normalized.includes('exclu')) {
      return 'Este cadastro não está mais disponível.';
    }

    return apiMessage;
  }

  if (status === 413) {
    return 'Não foi possível enviar sua foto. Tente novamente.';
  }

  return 'Não foi possível concluir o cadastro. Tente novamente.';
}

function normalizeTotalEncontrado(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function unwrapRecoveryRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (Array.isArray(payload)) {
    const firstItem = payload[0];

    return firstItem && typeof firstItem === 'object'
      ? (firstItem as Record<string, unknown>)
      : null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of ['recuperacao', 'recuperacaoSenha', 'data', 'record']) {
    const nested = record[key];

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }

  return record;
}

export function isRecoverableRecoveryRecord(payload: unknown): boolean {
  const record = unwrapRecoveryRecord(payload);

  if (!record) {
    return false;
  }

  if (toBoolean(record.usado) === true) {
    return false;
  }

  if (toBoolean(record.codigovalidado) === true) {
    return false;
  }

  return true;
}

function buildValidarRecuperacaoResult(payload: unknown): {
  valido: boolean;
  message: string | null;
  usersId: number | null;
} {
  const record =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  const valido = toBoolean(record.valido) ?? toBoolean(record.sucesso) ?? false;

  const usersId =
    normalizeRecordId(record.users_id) ??
    normalizeRecordId(record.users_id) ??
    normalizeRecordId(record.usersId) ??
    normalizeRecordId(record.id);

  return {
    valido,
    message: extractErrorMessage(payload),
    usersId,
  };
}

function buildLoginResponse(payload: unknown): LoginResponse {
  const record =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  return {
    authToken: extractAuthToken(payload) ?? undefined,
    senhaCorreta: toBoolean(record.senhaCorreta),
    sucesso: toBoolean(record.sucesso),
    encontrado: toBoolean(record.encontrado),
    codigoErro:
      typeof record.codigoErro === 'string' && record.codigoErro.trim()
        ? record.codigoErro.trim()
        : null,
    totalEncontrado: normalizeTotalEncontrado(record.totalEncontrado ?? record.TotalEncontrado),
    foto: extractPhotoUrlFromApiPayload(payload) ?? undefined,
  };
}

export async function buildSignupFoneFormData(data: SignupFoneRequest): Promise<FormData> {
  const condominioId = resolveSignupCondominioId(data.condominio_id);

  if (condominioId == null) {
    throw new ApiError(SIGNUP_CONDOMINIO_REQUIRED_MESSAGE);
  }

  const formData = createMultipartFormData();

  formData.append('nome', data.nome.trim());
  formData.append('telefoneLimpo', data.telefoneLimpo);
  formData.append('password', data.password);
  formData.append('matricula', data.matricula);
  formData.append('socioTitulo', data.matricula);
  formData.append('Socio', data.matricula);
  formData.append('endereco', data.endereco);
  formData.append('complemento', data.endereco);
  formData.append('condominio_id', String(condominioId));
  formData.append(SIGNUP_FORM_FIELDS.foto, data.Foto);
  formData.append(
    SIGNUP_FORM_FIELDS.ultimaPublicidadeData,
    data.ultimaPublicidadeData == null ? '' : String(data.ultimaPublicidadeData),
  );
  await appendPhotoUploadToFormData(
    formData,
    SIGNUP_FORM_FIELDS.fotoUpload,
    data.photoAsset,
  );

  return formData;
}

export async function signupFone(data: SignupFoneRequest): Promise<SignupFoneResponse> {
  const formData = await buildSignupFoneFormData(data);

  let response: Response;

  try {
    response = await postMultipartFormData(
      `${XANO_API_BASE_URL}${API_ENDPOINTS.auth.signupFone}`,
      formData,
    );
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.');
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(parseSignupFoneError(payload, response.status), response.status);
  }

  const authToken = extractAuthToken(payload);

  if (!authToken) {
    throw new ApiError(parseSignupFoneError(payload, response.status), response.status || 400);
  }

  return {
    authToken,
    foto: extractPhotoUrlFromApiPayload(payload) ?? undefined,
  };
}

/** @deprecated Use signupFone */
export const signupWithPhoto = signupFone;

export async function loginSafe(request: LoginRequest): Promise<LoginResponse> {
  return buildLoginResponse(
    await postRequest<unknown>(API_ENDPOINTS.auth.loginSafe, {
      telefoneLimpo: normalizePhoneForApi(request.telefoneLimpo),
      password: normalizeLoginPassword(request.password),
    }),
  );
}

export async function getMe(token: string): Promise<User> {
  const payload = await authGetRequest<unknown>(API_ENDPOINTS.auth.me, token);
  let user = normalizeUserFromApi(payload);

  if (!user.id) {
    throw new ApiError('Não foi possível carregar seus dados. Faça login novamente.', 401);
  }

  if (!user.telefoneLimpo && !user.telefone) {
    try {
      const extraPayload = await authGetRequest<unknown>(buildGetUserPath(user.id), token);
      const extraUser = normalizeUserFromApi(extraPayload);
      const telefoneLimpo = extraUser.telefoneLimpo || extraUser.telefone;

      if (telefoneLimpo) {
        user = {
          ...user,
          telefone: extraUser.telefone || telefoneLimpo,
          telefoneLimpo,
          telefoneConfirmado: extraUser.telefoneConfirmado || telefoneLimpo,
          telefoneCorrigido: extraUser.telefoneCorrigido || user.telefoneCorrigido,
        };
      }
    } catch {
      // Mantém os dados do /auth/me se /getUser não estiver disponível.
    }
  }

  if (user.bloqueado) {
    throw new ApiError(ASSOCIACAO_LOCAL_LABELS.acessoBloqueado, 403);
  }

  return user;
}

export async function solicitarRecuperacao(telefoneLimpo: string): Promise<string> {
  try {
    const response = await postRequest<SolicitarRecuperacaoResponse>(
      API_ENDPOINTS.auth.solicitarRecuperacao,
      { telefoneLimpo: normalizePhoneForApi(telefoneLimpo) },
    );

    return extractErrorMessage(response) ?? 'Código de recuperação enviado. Verifique seu WhatsApp.';
  } catch (error) {
    throw new ApiError(getPasswordRecoveryErrorMessage(error));
  }
}

export type ConsultarRecuperacaoResult = {
  record: ConsultarRecuperacaoResponse | null;
  checked: boolean;
};

export async function consultarRecuperacaoPendente(
  telefoneLimpo: string,
): Promise<ConsultarRecuperacaoResult> {
  try {
    const response = await postRequest<ConsultarRecuperacaoResponse>(
      API_ENDPOINTS.auth.consultarRecuperacao,
      { telefoneLimpo: normalizePhoneForApi(telefoneLimpo) },
    );

    if (!isRecoverableRecoveryRecord(response)) {
      return { record: null, checked: true };
    }

    return { record: response, checked: true };
  } catch {
    return { record: null, checked: false };
  }
}

export async function validarRecuperacao(
  telefoneLimpo: string,
  codigo: string,
): Promise<{ valido: boolean; message: string | null; usersId: number | null }> {
  try {
    const response = await postRequest<ValidarRecuperacaoResponse>(
      API_ENDPOINTS.auth.validarRecuperacao,
      { telefoneLimpo: normalizePhoneForApi(telefoneLimpo), codigo },
    );

    return buildValidarRecuperacaoResult(response);
  } catch (error) {
    throw new ApiError(getPasswordRecoveryErrorMessage(error));
  }
}

export async function alterarSenhaRecuperacao(
  telefoneLimpo: string,
  codigo: string,
  novaSenha: string,
): Promise<string> {
  try {
    const response = await postRequest<AlterarSenhaRecuperacaoResponse>(
      API_ENDPOINTS.auth.recuperacaoSenha,
      {
        telefoneLimpo: normalizePhoneForApi(telefoneLimpo),
        codigo,
        novaSenha,
      },
    );

    return extractErrorMessage(response) ?? 'Senha alterada com sucesso.';
  } catch (error) {
    throw new ApiError(getPasswordRecoveryErrorMessage(error));
  }
}

export async function alterarSenhaAutenticada(
  usersId: number,
  novaSenha: string,
  authToken: string,
): Promise<string> {
  try {
    const payload: AlterarPasswordUserRequest = {
      users_id: usersId,
      password: novaSenha,
    };
    const response = await authPatchRequest<AlterarSenhaAutenticadaResponse>(
      API_ENDPOINTS.alterarPasswordUser,
      authToken,
      payload,
    );

    return extractErrorMessage(response) ?? 'Senha alterada com sucesso.';
  } catch (error) {
    throw new ApiError(getPasswordRecoveryErrorMessage(error));
  }
}

function buildEsqueceuCadastroPayload(nome: string, telefoneLimpo: string) {
  return {
    nome: nome.trim(),
    telefoneLimpo: normalizePhoneForApi(telefoneLimpo),
  };
}

export async function consultarEsqueceuCadastro(
  nome: string,
  telefoneLimpo: string,
): Promise<EsqueceuCadastroUsuarioMatch[]> {
  try {
    const response = await getRequest<unknown>(
      buildPesquisarUsuarioPath({
        nome,
        telefoneLimpo: normalizePhoneForApi(telefoneLimpo),
      }),
    );

    return normalizeEsqueceuCadastroUsuarios(response);
  } catch (error) {
    throw new ApiError(getPasswordRecoveryErrorMessage(error));
  }
}

export async function esqueceuCadastro(nome: string, telefoneLimpo: string): Promise<string> {
  try {
    const response = await postRequest<EsqueceuCadastroResponse>(
      API_ENDPOINTS.auth.esqueceuCadastro,
      buildEsqueceuCadastroPayload(nome, telefoneLimpo),
    );

    return extractErrorMessage(response) ?? 'Solicitação enviada com sucesso.';
  } catch (error) {
    throw new ApiError(getPasswordRecoveryErrorMessage(error));
  }
}
