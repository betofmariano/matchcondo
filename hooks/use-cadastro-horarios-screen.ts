import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, getApiErrorMessage } from '@/services/api-client';
import {
  getAtividadesByAcademia,
  mapAtividadesToOptions,
} from '@/services/atividades-service';
import { createHorario, deleteHorario, getHorariosByAcademia } from '@/services/horarios-service';
import type { Atividade } from '@/types/atividade';
import type { Horario, HorarioDiaKey } from '@/types/horario';
import type { User } from '@/types/user';
import { CLUB_ADMIN_MESSAGES } from '@/utils/club-config';
import {
  createEmptyHorarioDiasSemana,
  formatHorarioListLabel,
  hasSelectedHorarioDia,
  horariosHaveSameSchedule,
  parseHourValue,
  parseMinuteValue,
  sanitizeHourInput,
  sanitizeMinuteInput,
  sortHorarios,
} from '@/utils/horario-cadastro-form';
import { useClubAdminSelection } from '@/hooks/use-club-admin-selection';

const SAVE_ERROR = 'Não foi possível cadastrar o horário. Tente novamente.';
const DELETE_SUCCESS = 'Horário excluído com sucesso.';
const SAVE_SUCCESS = 'Horário cadastrado com sucesso.';

type UseCadastroHorariosScreenParams = {
  user: User | null;
  authToken: string | null;
  isAuthLoading: boolean;
  onUnauthorized: () => void | Promise<void>;
};

type FieldErrors = {
  hora?: string;
  minutos?: string;
  dias?: string;
  atividade?: string;
};

export function useCadastroHorariosScreen({
  user,
  authToken,
  isAuthLoading,
  onUnauthorized,
}: UseCadastroHorariosScreenParams) {
  const clubSelection = useClubAdminSelection({
    user,
    authToken,
    isAuthLoading,
    onUnauthorized,
  });

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [selectedAtividadeId, setSelectedAtividadeId] = useState<number | null>(null);
  const [isLoadingAtividades, setIsLoadingAtividades] = useState(false);
  const [atividadesLoadError, setAtividadesLoadError] = useState<string | null>(null);

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [horaValue, setHoraValue] = useState('');
  const [minutosValue, setMinutosValue] = useState('');
  const [diasSemana, setDiasSemana] = useState(createEmptyHorarioDiasSemana);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showListPanel, setShowListPanel] = useState(true);

  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const atividadesRequestIdRef = useRef(0);
  const itemsRequestIdRef = useRef(0);

  const fetchAtividades = useCallback(async () => {
    if (!authToken || !clubSelection.selectedClubId || !clubSelection.canManageSelectedClub) {
      return;
    }

    const requestId = ++atividadesRequestIdRef.current;
    setIsLoadingAtividades(true);
    setAtividadesLoadError(null);
    setAtividades([]);
    setSelectedAtividadeId(null);

    try {
      const data = await getAtividadesByAcademia(clubSelection.selectedClubId, authToken);

      if (requestId !== atividadesRequestIdRef.current) {
        return;
      }

      const options = mapAtividadesToOptions(data);
      setAtividades(data);

      if (options.length === 1) {
        setSelectedAtividadeId(options[0].id);
      }
    } catch (error) {
      if (requestId !== atividadesRequestIdRef.current) {
        return;
      }

      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await onUnauthorized();
        return;
      }

      const message = getApiErrorMessage(error);
      setAtividadesLoadError(message.includes('conectar') ? message : CLUB_ADMIN_MESSAGES.loadError);
    } finally {
      if (requestId === atividadesRequestIdRef.current) {
        setIsLoadingAtividades(false);
      }
    }
  }, [
    authToken,
    clubSelection.canManageSelectedClub,
    clubSelection.selectedClubId,
    onUnauthorized,
  ]);

  const fetchHorarios = useCallback(
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
      setHorarios([]);

      try {
        const data = await getHorariosByAcademia(
          clubSelection.selectedClubId,
          authToken,
          selectedAtividadeId,
        );

        if (requestId !== itemsRequestIdRef.current) {
          return;
        }

        setHorarios(sortHorarios(data));
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
      selectedAtividadeId,
    ],
  );

  useEffect(() => {
    if (
      clubSelection.isLoadingClub ||
      !clubSelection.selectedClubId ||
      !clubSelection.canManageSelectedClub
    ) {
      setAtividades([]);
      setSelectedAtividadeId(null);
      setHorarios([]);
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
    if (!clubSelection.selectedClubId || !clubSelection.canManageSelectedClub || !selectedAtividadeId) {
      setHorarios([]);
      setItemsLoadError(null);
      return;
    }

    void fetchHorarios();
  }, [
    clubSelection.canManageSelectedClub,
    clubSelection.selectedClubId,
    fetchHorarios,
    selectedAtividadeId,
  ]);

  useEffect(() => {
    setHoraValue('');
    setMinutosValue('');
    setDiasSemana(createEmptyHorarioDiasSemana());
    setFieldErrors({});
  }, [clubSelection.selectedClubId, selectedAtividadeId]);

  function resetFormFields() {
    setHoraValue('');
    setMinutosValue('');
    setDiasSemana(createEmptyHorarioDiasSemana());
    setFieldErrors({});
  }

  function handleHoraChange(value: string) {
    setHoraValue(sanitizeHourInput(value));

    if (fieldErrors.hora) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.hora;
        return next;
      });
    }
  }

  function handleMinutosChange(value: string) {
    setMinutosValue(sanitizeMinuteInput(value));

    if (fieldErrors.minutos) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.minutos;
        return next;
      });
    }
  }

  function handleToggleDia(key: HorarioDiaKey) {
    setDiasSemana((current) => ({
      ...current,
      [key]: !current[key],
    }));

    if (fieldErrors.dias) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.dias;
        return next;
      });
    }
  }

  function handleAtividadeChange(atividadeId: number) {
    setSelectedAtividadeId(atividadeId);

    if (fieldErrors.atividade) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.atividade;
        return next;
      });
    }
  }

  async function saveHorario(): Promise<string | null> {
    if (!user || !authToken || !clubSelection.loadedClub || !clubSelection.selectedClubId) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    if (!clubSelection.canManageSelectedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    const errors: FieldErrors = {};

    if (!selectedAtividadeId) {
      errors.atividade = 'Selecione uma atividade.';
    }

    const hora = parseHourValue(horaValue);
    const minutos = parseMinuteValue(minutosValue);

    if (!horaValue.trim() || !Number.isFinite(hora)) {
      errors.hora = 'Informe a hora entre 0 e 23.';
    }

    if (!minutosValue.trim() || !Number.isFinite(minutos)) {
      errors.minutos = 'Informe os minutos entre 0 e 59.';
    }

    if (!hasSelectedHorarioDia(diasSemana)) {
      errors.dias = 'Marque ao menos um dia da semana.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return 'Preencha corretamente os campos do horário.';
    }

    if (!selectedAtividadeId) {
      setFieldErrors({ atividade: 'Selecione uma atividade válida.' });
      return 'Selecione uma atividade válida.';
    }

    const selectedAtividade = atividades.find((item) => item.id === selectedAtividadeId);

    if (!selectedAtividade) {
      setFieldErrors({ atividade: 'Selecione uma atividade válida.' });
      return 'Selecione uma atividade válida.';
    }

    const atividadeId = selectedAtividadeId;
    const draftHorario = {
      atividades_id: atividadeId,
      hora,
      minutos,
      ...diasSemana,
    };

    if (horarios.some((item) => horariosHaveSameSchedule(item, draftHorario))) {
      setFieldErrors({
        hora: 'Este horário já está cadastrado.',
        minutos: 'Este horário já está cadastrado.',
      });
      return 'Este horário já está cadastrado para a atividade.';
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      await createHorario(
        {
          condominio_id: clubSelection.selectedClubId,
          atividades_id: atividadeId,
          atividade: selectedAtividade.atividade,
          capacidade: selectedAtividade.capacidade,
          hora,
          minutos,
          tipoProgramacao: selectedAtividade.tipoProgramacao,
          ...diasSemana,
        },
        authToken,
      );

      resetFormFields();
      await fetchHorarios();

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

  async function removeHorario(horarioItem: Horario): Promise<string | null> {
    if (!user || !authToken || !clubSelection.loadedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    if (!clubSelection.canManageSelectedClub) {
      return CLUB_ADMIN_MESSAGES.permission;
    }

    setIsDeleting(true);

    try {
      await deleteHorario(horarioItem.id, authToken);
      await fetchHorarios();

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
          : 'Não foi possível excluir o horário. Tente novamente.';
    } finally {
      setIsDeleting(false);
    }
  }

  const hasUnsavedInput =
    horaValue.trim().length > 0 ||
    minutosValue.trim().length > 0 ||
    hasSelectedHorarioDia(diasSemana);

  return {
    ...clubSelection,
    atividades: mapAtividadesToOptions(atividades),
    selectedAtividadeId,
    isLoadingAtividades,
    atividadesLoadError,
    horarios,
    horaValue,
    minutosValue,
    diasSemana,
    fieldErrors,
    showListPanel,
    isLoadingItems,
    itemsLoadError,
    isRefreshing,
    isSaving,
    isDeleting,
    hasUnsavedInput,
    setSelectedAtividadeId: handleAtividadeChange,
    setShowListPanel,
    handleHoraChange,
    handleMinutosChange,
    handleToggleDia,
    fetchAvailableClubs: clubSelection.fetchAvailableClubs,
    fetchAtividades,
    fetchHorarios,
    saveHorario,
    removeHorario,
    formatHorarioListLabel,
    messages: {
      saveSuccess: SAVE_SUCCESS,
      deleteSuccess: DELETE_SUCCESS,
      emptyList: 'Não há horários cadastrados para esta atividade.',
    },
  };
}
