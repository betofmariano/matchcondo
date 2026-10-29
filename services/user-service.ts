import {
  API_ENDPOINTS,
  buildGetUserPath,
  buildUsersDeletePath,
  buildUsersItemPath,
  buildUsersLocalItemPath,
} from '@/constants/api';
import { UPDATE_PHOTO_FORM_FIELDS } from '@/constants/user-photo-form';
import {
  ApiError,
  authDeleteRequest,
  authGetRequest,
  authMultipartPatchRequest,
  authPatchRequest,
  getRequest,
} from '@/services/api-client';
import type { PhotoAsset, UpdatePhotoResponse } from '@/types/user-photo';
import type { User } from '@/types/user';
import { normalizeUserFromApi } from '@/utils/normalize-user';
import {
  appendPhotoUploadToFormData,
  createMultipartFormData,
  resolveUploadFilename,
  resolveUploadMimeType,
} from '@/utils/photo-upload-form-data';
import { extractPhotoUrlFromApiPayload, readUsersTableFotoText } from '@/utils/user-photo';

export async function getUserById(usersId: number, authToken: string): Promise<User | null> {
  if (usersId <= 0) {
    return null;
  }

  try {
    const data = await authGetRequest<unknown>(buildGetUserPath(usersId), authToken);

    if (!data || typeof data !== 'object') {
      return null;
    }

    const user = normalizeUserFromApi(data);

    if (!user.id) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function getUserPhoto(userslocalId: number, authToken: string): Promise<string | null> {
  const data = await authGetRequest<unknown>(buildUsersLocalItemPath(userslocalId), authToken);

  return extractPhotoUrlFromApiPayload(data);
}

/** GET /users/{users_id} — usa o campo texto `Foto` da tabela users. */
export async function getUserPhotoByUsersId(
  usersId: number,
  authToken?: string | null,
): Promise<string | null> {
  if (usersId <= 0) {
    return null;
  }

  const path = buildUsersItemPath(usersId);
  const data = authToken
    ? await authGetRequest<unknown>(path, authToken)
    : await getRequest<unknown>(path);

  return readUsersTableFotoText(data);
}

export async function atualizarUltimaPublicidadeData(
  user: Pick<User, 'id'>,
  ultimaPublicidadeData: number,
  authToken: string,
): Promise<void> {
  await authPatchRequest(
    buildUsersItemPath(user.id),
    authToken,
    {
      ultimaPublicidadeData,
    },
  );
}

export async function buildUpdatePhotoFormData(
  userId: number,
  photoAsset: PhotoAsset,
): Promise<FormData> {
  const formData = createMultipartFormData();
  const filename = resolveUploadFilename(photoAsset);
  const mimeType = resolveUploadMimeType(filename, photoAsset);

  formData.append(UPDATE_PHOTO_FORM_FIELDS.usersId, String(userId));
  await appendPhotoUploadToFormData(
    formData,
    UPDATE_PHOTO_FORM_FIELDS.fotoUpload,
    photoAsset,
    filename,
    mimeType,
  );

  return formData;
}

export async function updateUserPhoto(
  userId: number,
  photoAsset: PhotoAsset,
  token: string,
): Promise<UpdatePhotoResponse> {
  console.log('Alteração de foto iniciada');
  console.log('Usuário identificado:', Boolean(userId));
  console.log('Foto selecionada:', Boolean(photoAsset));

  const formData = await buildUpdatePhotoFormData(userId, photoAsset);

  try {
    const response = await authMultipartPatchRequest<UpdatePhotoResponse>(
      API_ENDPOINTS.user.alterarFoto,
      token,
      formData,
    );

    console.log('Resposta da alteração de foto recebida');

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('Não foi possível atualizar sua foto. Tente novamente.');
  }
}

/** DELETE /users/{users_id} da conta autenticada. */
export async function excluirContaDoUsuario(usersId: number, authToken: string): Promise<void> {
  if (usersId <= 0) {
    throw new ApiError('Não foi possível identificar a conta.');
  }

  if (!authToken.trim()) {
    throw new ApiError('Sessão expirada. Faça login novamente.');
  }

  await authDeleteRequest(buildUsersDeletePath(usersId), authToken);
}
