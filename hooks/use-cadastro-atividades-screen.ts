import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, getApiErrorMessage } from '@/services/api-client';
import {
  createAtividade,
  deleteAtividade,
  getAtividadesByAcademia,
  updateAtividade,
} from '@/services/atividades-service';
import type { Atividade } from '@/types/atividade';
import type { User } from '@/types/user';
import { CLUB_ADMIN_MESSAGES } from '@/utils/club-config';
import type { UpdateAtividadePayload } from '@/utils/atividade-form';
import { useClubAdminSelection } from '@/hooks/use-club-admin-selection';

const SAVE_ERROR = 'Não foi possível cadastrar a atividade. Tente novamente.';
const UPDATE_ERROR = 'Não foi possível salvar a atividade. Tente novamente.';
const DELETE_SUCCESS = 'Atividade excluída com sucesso.';
const SAVE_SUCCESS = 'Atividade cadastrada com sucesso.';
const UPDATE_SUCCESS = 'Atividade atualizada com sucesso.';

type UseCadastroAtividadesScreenParams = {
  user: User | null;
  authToken: string | null;
  isAuthLoading: boolean;
  onUnauthorized: () => void | Promise<void>;
};

function normalizeAtividadeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function sortAtividades(items: Atividade[]): Atividade[] {
  return [...items].sort((a, b) => a.atividade.localeCompare(b.atividade, 'pt-BR'));
}

export function useCadastroAtividadesScreen({
  user,
  authToken,
  isAuthLoading,
  onUnauthorized,
}: UseCadastroAtividadesScreenParams) {
  const clubSelection = useClubAdminSelection({
    user,
    authToken,
    isAuthLoading,
    onUnauthorized,
  });

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadeValue, setAtividadeValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const itemsRequestIdRef = useRef(0);

  const fetchAtividades = useCallback(
    async (options?: { refreshing?: boolean }) => {
      if (!authToken || !clubSelection.selectedClubId || !clubSelection.canManageSelectedClub) {
        return;
      }

      const requestId = ++itemsRequestIdRef.current;
      const refreshing = options?.refreshing === true;

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoadingItems(true);
      }

      setItemsLoadError(null);
      setAtividades([]);

      try {
        const data = await getAtividadesByAcademia(clubSelection.selectedClubId, authToken);

        if (requestId !== itemsRequestIdRef.current) {
          return;
        }

        const sorted = sortAtividades(data);
        setAtividades(sorted);
      } catch (error) {
        if (requestId !== itemsRequestIdRef.current) {
          return;
        }

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await onUnauthorized();
          return;
        }

        const message = getApiErrorMessage(error);
        setItemsLoadError(message.includes('conectar') ? message : CLUB_ADMIN_MESSAGES.loadError);
      } finally {
        if (requestId === itemsRequestIdRef.current) {
          setIsLoadingItems(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      authToken,
      clubSelection.canManageSelectedClub,
      clubSelection.selectedClubId,
      onUnauthorized,
    ],
  );

  useEffect(() => {
    if (
      clubSelection.isLoadingClub ||
      !clubSelection.selectedClubId ||
      !clubSelection.canManageSelectedClub
    ) {
      setAtividades([]);
      setItemsLoadError(null);
      return;
    }

    void fetchAtividades();
  }, [
    clubSelection.canManageSelectedClub,
    clubSelection.isLoadingClub,
    clubSelection.selectedClubId,
    fetchAtividades,
  ]);

  useEffect(() => {
    setAtividadeValue('');
    setFieldError(null);
  }, [clubSelection.selectedClubId]);

  function handleAtividadeChange(value: string) {
    setAtividadeValue(value);

    if (fieldError) {
      setFieldError(null);
    }
  }

  async function saveAtividade(): Promise<string | null> {
    if (!user || !authToken || !clubSelection.loadedClub || !clubSelection.selectedClubId) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    if (!clubSelection.canManageSelectedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    const atividade = normalizeAtividadeName(atividadeValue);

    if (!atividade) {
      setFieldError('Informe uma atividade válida.');
      return 'Informe uma atividade válida.';
    }

    const duplicate = atividades.some(
      (item) =>
        item.atividade.localeCompare(atividade, 'pt-BR', { sensitivity: 'accent' }) === 0,
    );

    if (duplicate) {
      setFieldError('Esta atividade já está cadastrada para o clube.');
      return 'Esta atividade já está cadastrada para o clube.';
    }

    setIsSaving(true);
    setFieldError(null);

    try {
      await createAtividade(
        {
          nome: atividade,
          condominio_id: clubSelection.selectedClubId,
        },
        authToken,
      );

      setAtividadeValue('');
      await fetchAtividades();

      return null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await onUnauthorized();
        return CLUB_ADMIN_MESSAGES.permission;
      }

      const message = getApiErrorMessage(error);
      return message.includes('conectar')
        ? message
        : message.length < 120
          ? message
          : SAVE_ERROR;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateAtividadeItem(
    atividadeItem: Atividade,
    payload: UpdateAtividadePayload,
  ): Promise<string | null> {
    if (!user || !authToken || !clubSelection.loadedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    if (!clubSelection.canManageSelectedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    const duplicate = atividades.some(
      (item) =>
        item.id !== atividadeItem.id &&
        item.atividade.localeCompare(payload.nome, 'pt-BR', { sensitivity: 'accent' }) === 0,
    );

    if (duplicate) {
      return 'Esta atividade já está cadastrada para o clube.';
    }

    setIsUpdating(true);

    try {
      await updateAtividade(atividadeItem.id, payload, authToken);
      await fetchAtividades();

      return null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await onUnauthorized();
        return CLUB_ADMIN_MESSAGES.permission;
      }

      const message = getApiErrorMessage(error);
      return message.includes('conectar')
        ? message
        : message.length < 120
          ? message
          : UPDATE_ERROR;
    } finally {
      setIsUpdating(false);
    }
  }

  async function removeAtividade(atividadeItem: Atividade): Promise<string | null> {
    if (!user || !authToken || !clubSelection.loadedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    if (!clubSelection.canManageSelectedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    if (atividadeItem.qtdeHorarios !== 0) {
      return 'Esta atividade possui horários vinculados e não pode ser excluída.';
    }

    setIsDeleting(true);

    try {
      await deleteAtividade(atividadeItem.id, authToken);
      await fetchAtividades();

      return null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await onUnauthorized();
        return CLUB_ADMIN_MESSAGES.permission;
      }

      const message = getApiErrorMessage(error);
      return message.includes('conectar')
        ? message
        : message.length < 120
          ? message
          : 'Não foi possível excluir a atividade. Tente novamente.';
    } finally {
      setIsDeleting(false);
    }
  }

  const hasUnsavedInput = atividadeValue.trim().length > 0;

  return {
    ...clubSelection,
    atividades,
    atividadeValue,
    fieldError,
    isLoadingItems,
    itemsLoadError,
    isRefreshing,
    isSaving,
    isUpdating,
    isDeleting,
    hasUnsavedInput,
    handleAtividadeChange,
    fetchAtividades,
    saveAtividade,
    updateAtividadeItem,
    removeAtividade,
    messages: {
      saveSuccess: SAVE_SUCCESS,
      updateSuccess: UPDATE_SUCCESS,
      deleteSuccess: DELETE_SUCCESS,
      emptyList: 'Não há atividades cadastradas.',
    },
  };
}
