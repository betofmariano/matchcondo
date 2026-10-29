import { useCallback, useEffect, useState } from 'react';

import { ApiError, getApiErrorMessage } from '@/services/api-client';
import { criarMapaDiario, getUltimaDataAtividadeMapaDiario } from '@/services/mapa-diario-service';
import {
  formatMapaDiarioApiDate,
  formatMapaDiarioShortDate,
  isMapaDiarioApiDate,
  localCalendarDateFromTimestamp,
  suggestNextMapaDiarioDate,
} from '@/utils/criar-mapa-diario';

export const CRIAR_MAPA_DIARIO_MESSAGES = {
  loadError: 'Não foi possível carregar as datas do mapa diário.',
  createError: 'Não foi possível criar o mapa diário. Tente novamente.',
  createSuccess: 'Mapa diário criado com sucesso.',
};

const GENERIC_API_ERROR = 'Não foi possível concluir a operação. Tente novamente.';

type UseCriarMapaDiarioParams = {
  enabled: boolean;
};

export function useCriarMapaDiario({ enabled }: UseCriarMapaDiarioParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [ultimaDataJogo, setUltimaDataJogo] = useState<Date | null>(null);
  const [dataSugerida, setDataSugerida] = useState('');

  const loadDates = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const latestTimestamp = await getUltimaDataAtividadeMapaDiario();
      const ultima =
        latestTimestamp != null ? localCalendarDateFromTimestamp(latestTimestamp) : null;
      const sugerida = suggestNextMapaDiarioDate(latestTimestamp);

      setUltimaDataJogo(ultima);
      setDataSugerida(formatMapaDiarioApiDate(sugerida));
    } catch (error) {
      const message = getApiErrorMessage(error);
      setLoadError(message.includes('conectar') ? message : CRIAR_MAPA_DIARIO_MESSAGES.loadError);
      setUltimaDataJogo(null);
      setDataSugerida('');
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void loadDates();
  }, [enabled, loadDates]);

  const criarMapa = useCallback(async (): Promise<string | null> => {
    if (!isMapaDiarioApiDate(dataSugerida)) {
      return CRIAR_MAPA_DIARIO_MESSAGES.createError;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      await criarMapaDiario(dataSugerida.trim());
      await loadDates();
      return null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        throw error;
      }

      const message = getApiErrorMessage(error);
      const errorMessage =
        message.includes('conectar') ||
        (message !== GENERIC_API_ERROR && message !== 'Ocorreu um erro inesperado. Tente novamente.')
          ? message
          : CRIAR_MAPA_DIARIO_MESSAGES.createError;

      setCreateError(errorMessage);
      return errorMessage;
    } finally {
      setIsCreating(false);
    }
  }, [dataSugerida, loadDates]);

  return {
    isLoading,
    loadError,
    isCreating,
    createError,
    ultimaDataJogo,
    dataSugerida,
    setDataSugerida,
    ultimaDataLabel: ultimaDataJogo ? formatMapaDiarioShortDate(ultimaDataJogo) : '—',
    dataSugeridaValida: isMapaDiarioApiDate(dataSugerida),
    loadDates,
    criarMapa,
    clearCreateError: () => setCreateError(null),
  };
}
