import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, getApiErrorMessage } from '@/services/api-client';
import { getAtividadeById } from '@/services/atividades-service';
import { getAtividadeUnidadesByAtividade } from '@/services/atividade-unidade-service';
import { getHorariosByAcademia } from '@/services/horarios-service';
import { getMapaDiarioReserva } from '@/services/mapa-diario-reserva-service';
import { getMapaSemanal } from '@/services/mapa-semanal-service';
import {
  carregarMapaReservaHorario,
  confirmarReservaHorario,
  resolveAcademiaForReserva,
} from '@/services/reserva-horario-flow-service';
import { criarReservaDiaria, getReservasDiariasDoUsuario } from '@/services/reservas-diarias-service';
import { getReservasMensalPorSemanaLimiteSemanalUsuario } from '@/services/reservas-mensal-por-semana-service';
import { criarReservaSemanal, getReservasSemanaisDoUsuario } from '@/services/reservas-semanais-service';
import type { Academia } from '@/types/academia';
import type { Atividade } from '@/types/atividade';
import type { AtividadeUnidade } from '@/types/atividade-unidade';
import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import type { MapaSemanalItem } from '@/types/mapa-semanal';
import type { CriarReservaResponse, ReservaResponsavelActor } from '@/types/reserva';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import {
  resolveAtividadePadrao,
  resolveLimiteReservasSemana,
  resolveUsaMensalPorSemana,
} from '@/utils/atividade-programacao';
import {
  buildMapaAtividadeUnidadeTabs,
  filterMapaDiarioByAtividadeUnidade,
  resolveInitialAtividadeUnidadeTabId,
  type MapaAtividadeUnidadeTab,
} from '@/utils/mapa-diario-atividade-unidade';
import {
  buildMapaMensalPorSemanaSemanaOptionsWithLimit,
  filterMapaDiarioFuturoBySemana,
  isSemanaMensalPorSemanaLimiteAtingido,
  type MapaMensalPorSemanaSemanaOption,
} from '@/utils/mapa-mensal-por-semana-opcoes';
import {
  CAPACIDADE_ESGOTADA_MESSAGE,
  filterMapaDiarioFuturoExibiveis,
  filterMapaDiarioFuturoReservaveis,
  getProximaDataLiberacaoFromMapaItems,
  getProximaLiberacaoTimestamp,
  mapaDiarioFuturoTemCapacidadeDisponivel,
  sortMapaDiarioFuturoAsc,
  type MapaDiarioFuturoFilters,
} from '@/utils/mapa-diario-futuro';
import {
  isLimiteReservasDiariasNaSemanaAtingido,
  isLimiteReservasSemanaisAtingido,
} from '@/utils/reserva-modalidade-limite';
import { getServerDate, getServerNow } from '@/utils/server-time';

const LOAD_ERROR = 'Não foi possível carregar os horários disponíveis.';
const LIMITE_SEMANA_MESSAGE = 'Você já atingiu o limite de reservas para esta semana.';
const LIMITE_SEMANAL_MESSAGE = 'Você já atingiu o limite de reservas semanais desta atividade.';
const EMPTY_MESSAGE = 'Não há horários liberados para reserva nesta atividade.';
const EMPTY_SEMANA_MESSAGE = 'Não há semanas disponíveis para reserva nesta atividade.';
const LIBERACAO_REFRESH_DELAY_MS = 100;
/** Mesmo intervalo do MatchPoint (`use-mapa-reservas-screen`). */
const MAPA_POLL_INTERVAL_MS = 3_000;

type FetchHorariosOptions = {
  refreshing?: boolean;
  silent?: boolean;
  force?: boolean;
};

type UseReservarHorarioScreenParams = {
  userId: number | null;
  reservationTargetUserId?: number | null;
  academiasId: number | null;
  atividadesId: number | null;
  authToken: string | null;
  onUnauthorized: () => void | Promise<void>;
};

export function useReservarHorarioScreen({
  userId,
  reservationTargetUserId = null,
  academiasId,
  atividadesId,
  authToken,
  onUnauthorized,
}: UseReservarHorarioScreenParams) {
  const [allHorarios, setAllHorarios] = useState<MapaDiarioFuturoItem[]>([]);
  const [horariosSemanal, setHorariosSemanal] = useState<MapaSemanalItem[]>([]);
  const [reservasMensalPorSemana, setReservasMensalPorSemana] = useState<ReservaUsuario[]>([]);
  const [academia, setAcademia] = useState<Academia | null>(null);
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [atividadeUnidades, setAtividadeUnidades] = useState<AtividadeUnidade[]>([]);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<number | null>(null);
  const [selectedSemana, setSelectedSemana] = useState<number | null>(null);
  const [referenceDate, setReferenceDate] = useState(() => getServerDate());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);
  const academiaRef = useRef<Academia | null>(null);
  const atividadeRef = useRef<Atividade | null>(null);
  const reservasMensalPorSemanaRef = useRef<ReservaUsuario[]>([]);
  const allHorariosRef = useRef<MapaDiarioFuturoItem[]>([]);
  const horariosSemanalRef = useRef<MapaSemanalItem[]>([]);

  reservasMensalPorSemanaRef.current = reservasMensalPorSemana;
  allHorariosRef.current = allHorarios;
  horariosSemanalRef.current = horariosSemanal;

  const isReady = academiasId != null && atividadesId != null;

  const limiteSemanalUserId = reservationTargetUserId ?? userId;
  const padrao = resolveAtividadePadrao(atividade?.tipoProgramacao);
  const usaMensalPorSemana = resolveUsaMensalPorSemana({ atividade });
  const limiteReservasSemana = resolveLimiteReservasSemana({ atividade });

  const filters = useMemo<MapaDiarioFuturoFilters | null>(() => {
    if (!isReady) {
      return null;
    }

    return {
      academias_id: academiasId,
      atividades_id: atividadesId,
    };
  }, [academiasId, atividadesId, isReady]);

  const horariosReservaveis = useMemo(() => {
    if (!filters) {
      return [];
    }

    return filterMapaDiarioFuturoReservaveis(allHorarios, filters, referenceDate);
  }, [allHorarios, filters, referenceDate]);

  const horariosExibiveis = useMemo(() => {
    if (!filters) {
      return [];
    }

    return filterMapaDiarioFuturoExibiveis(allHorarios, filters, referenceDate);
  }, [allHorarios, filters, referenceDate]);

  const temHorarioLiberado = horariosExibiveis.length > 0;

  // Semanas só com horários já liberados — sem liberação, não mostra o seletor.
  const semanaOptions = useMemo<MapaMensalPorSemanaSemanaOption[]>(() => {
    if (!usaMensalPorSemana || !filters || !temHorarioLiberado) {
      return [];
    }

    return buildMapaMensalPorSemanaSemanaOptionsWithLimit(
      horariosExibiveis,
      filters,
      reservasMensalPorSemana,
      limiteReservasSemana,
      referenceDate,
    );
  }, [
    filters,
    horariosExibiveis,
    limiteReservasSemana,
    referenceDate,
    reservasMensalPorSemana,
    temHorarioLiberado,
    usaMensalPorSemana,
  ]);

  const horariosDaSemana = useMemo(() => {
    if (padrao === 'Diaria') {
      return sortMapaDiarioFuturoAsc(horariosExibiveis);
    }

    if (!usaMensalPorSemana) {
      return horariosReservaveis;
    }

    if (selectedSemana == null) {
      return [];
    }

    return sortMapaDiarioFuturoAsc(
      filterMapaDiarioFuturoBySemana(horariosExibiveis, selectedSemana),
    );
  }, [horariosExibiveis, horariosReservaveis, padrao, selectedSemana, usaMensalPorSemana]);

  const unidadesById = useMemo(() => {
    const map = new Map<number, AtividadeUnidade>();

    for (const unidade of atividadeUnidades) {
      map.set(unidade.id, unidade);
    }

    return map;
  }, [atividadeUnidades]);

  const unidadeTabs = useMemo<MapaAtividadeUnidadeTab[]>(() => {
    if (padrao === 'Semanal') {
      return buildMapaAtividadeUnidadeTabs(horariosSemanal, unidadesById);
    }

    if (padrao === 'Diaria') {
      return buildMapaAtividadeUnidadeTabs(horariosExibiveis, unidadesById);
    }

    const source = selectedSemana != null ? horariosDaSemana : allHorarios;

    return buildMapaAtividadeUnidadeTabs(source, unidadesById);
  }, [
    allHorarios,
    horariosDaSemana,
    horariosExibiveis,
    horariosSemanal,
    padrao,
    selectedSemana,
    unidadesById,
  ]);

  const horarios = useMemo(() => {
    if (unidadeTabs.length === 0) {
      return horariosDaSemana;
    }

    if (padrao === 'Semanal') {
      return horariosDaSemana;
    }

    return filterMapaDiarioByAtividadeUnidade(horariosDaSemana, selectedUnidadeId);
  }, [horariosDaSemana, padrao, selectedUnidadeId, unidadeTabs.length]);

  const horariosSemanalVisiveis = useMemo(() => {
    const ordenados = [...horariosSemanal].sort((a, b) => {
      if (a.diaSemana !== b.diaSemana) {
        return a.diaSemana - b.diaSemana;
      }

      if (a.hora !== b.hora) {
        return a.hora - b.hora;
      }

      return a.minutos - b.minutos;
    });

    if (unidadeTabs.length === 0 || selectedUnidadeId == null) {
      return ordenados;
    }

    return ordenados.filter((item) => item.atividadeunidade_id === selectedUnidadeId);
  }, [horariosSemanal, selectedUnidadeId, unidadeTabs.length]);

  const proximaLiberacaoFromMapa = useMemo(() => {
    if (!filters) {
      return null;
    }

    const source =
      usaMensalPorSemana && selectedSemana != null
        ? filterMapaDiarioFuturoBySemana(allHorarios, selectedSemana)
        : allHorarios;

    return (
      getProximaLiberacaoTimestamp(source, filters, referenceDate) ??
      getProximaDataLiberacaoFromMapaItems(source, filters, referenceDate)
    );
  }, [allHorarios, filters, referenceDate, selectedSemana, usaMensalPorSemana]);

  const proximaLiberacao = proximaLiberacaoFromMapa;

  /** Sem horário liberado: não mostra semanas; countdown quando houver dataLiberacao futura. */
  const isAguardandoLiberacao = padrao !== 'Semanal' && !temHorarioLiberado;

  const fetchHorarios = useCallback(
    async (options?: FetchHorariosOptions) => {
      if (!authToken || !filters) {
        if (!options?.silent) {
          setAllHorarios([]);
          setHorariosSemanal([]);
          setReservasMensalPorSemana([]);
          setAcademia(null);
          setAtividade(null);
          setAtividadeUnidades([]);
          setSelectedUnidadeId(null);
          academiaRef.current = null;
          atividadeRef.current = null;
          setSelectedSemana(null);
          setLoadError(null);
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return;
      }

      if (options?.silent && isFetchingRef.current && !options?.force) {
        return;
      }

      const isSilent = options?.silent === true;
      const requestId = isSilent ? null : ++requestIdRef.current;
      const refreshing = options?.refreshing === true;
      const showFullLoading = !isSilent && !refreshing;
      const showRefreshIndicator = !isSilent && refreshing;

      isFetchingRef.current = true;

      if (showFullLoading) {
        setIsLoading(true);
        setSelectedSemana(null);
      }

      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }

      if (!isSilent) {
        setLoadError(null);
      }

      try {
        let resolvedAcademia = academiaRef.current;
        let resolvedAtividade = atividadeRef.current;

        if (!isSilent || !resolvedAcademia || !resolvedAtividade) {
          [resolvedAcademia, resolvedAtividade] = await Promise.all([
            resolveAcademiaForReserva(filters.academias_id),
            getAtividadeById(filters.atividades_id, authToken),
          ]);

          if (!isSilent && requestId !== requestIdRef.current) {
            return;
          }

          academiaRef.current = resolvedAcademia;
          atividadeRef.current = resolvedAtividade;
          setAcademia(resolvedAcademia);
          setAtividade(resolvedAtividade);
        }

        setReferenceDate(getServerDate());

        const padraoAtual = resolveAtividadePadrao(resolvedAtividade?.tipoProgramacao);

        let resolvedUnidades: AtividadeUnidade[] = [];

        try {
          resolvedUnidades = await getAtividadeUnidadesByAtividade(
            filters.atividades_id,
            authToken,
          );
        } catch {
          resolvedUnidades = [];
        }

        if (!isSilent && requestId !== requestIdRef.current) {
          return;
        }

        setAtividadeUnidades(resolvedUnidades);

        void getHorariosByAcademia(
          filters.academias_id,
          authToken,
          filters.atividades_id,
        ).catch(() => []);

        if (padraoAtual === 'Diaria') {
          const data = await getMapaDiarioReserva(authToken, filters);

          if (!isSilent && requestId !== requestIdRef.current) {
            return;
          }

          setAllHorarios(data);
          setHorariosSemanal([]);
          setReservasMensalPorSemana([]);
        } else if (padraoAtual === 'Semanal') {
          const data = await getMapaSemanal(authToken, filters);

          if (!isSilent && requestId !== requestIdRef.current) {
            return;
          }

          setHorariosSemanal(data);
          setAllHorarios([]);
          setReservasMensalPorSemana([]);
        } else {
          const [data, reservas] = await Promise.all([
            carregarMapaReservaHorario(authToken, filters, resolvedAcademia, {
              usaMensalPorSemana: true,
              userId: limiteSemanalUserId ?? undefined,
            }),
            limiteSemanalUserId
              ? getReservasMensalPorSemanaLimiteSemanalUsuario(
                  limiteSemanalUserId,
                  filters.academias_id,
                  authToken,
                )
              : Promise.resolve([]),
          ]);

          if (!isSilent && requestId !== requestIdRef.current) {
            return;
          }

          setAllHorarios(data);
          setHorariosSemanal([]);
          setReservasMensalPorSemana(reservas);
        }
      } catch (error) {
        if (!isSilent && requestId !== requestIdRef.current) {
          return;
        }

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await onUnauthorized();
          return;
        }

        if (!isSilent) {
          const message = getApiErrorMessage(error);
          setLoadError(message.includes('conectar') ? message : LOAD_ERROR);
          setAllHorarios([]);
          setHorariosSemanal([]);
          setReservasMensalPorSemana([]);
          setSelectedSemana(null);
        }
      } finally {
        isFetchingRef.current = false;

        if (!isSilent && requestId === requestIdRef.current) {
          if (showFullLoading) {
            setIsLoading(false);
          }

          if (showRefreshIndicator) {
            setIsRefreshing(false);
          }
        }
      }
    },
    [authToken, limiteSemanalUserId, filters, onUnauthorized],
  );

  const confirmarReserva = useCallback(
    async (
      item: MapaDiarioFuturoItem,
      usersId: number,
      responsavelActor: ReservaResponsavelActor,
    ): Promise<{ response: CriarReservaResponse; podeReservarMais: boolean }> => {
      if (!authToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!academiaRef.current && filters?.academias_id) {
        academiaRef.current = await resolveAcademiaForReserva(filters.academias_id);
        setAcademia(academiaRef.current);
      }

      if (!atividadeRef.current && filters?.atividades_id) {
        atividadeRef.current = await getAtividadeById(filters.atividades_id, authToken);
        setAtividade(atividadeRef.current);
      }

      if (!item?.id || !usersId) {
        throw new Error('Selecione um horário disponível para reservar.');
      }

      if (!mapaDiarioFuturoTemCapacidadeDisponivel(item)) {
        throw new Error(CAPACIDADE_ESGOTADA_MESSAGE);
      }

      const padraoAtual = resolveAtividadePadrao(atividadeRef.current?.tipoProgramacao);
      const usaMensalPorSemana = padraoAtual === 'MensalPorSemana';
      const limiteSemana = resolveLimiteReservasSemana({
        atividade: atividadeRef.current,
      });

      if (padraoAtual === 'Diaria') {
        const atividadesId = filters?.atividades_id ?? item.atividades_id;
        const reservasAtuais = await getReservasDiariasDoUsuario(usersId, authToken);

        if (
          isLimiteReservasDiariasNaSemanaAtingido(
            item.dataAtividade,
            reservasAtuais,
            atividadesId,
            limiteSemana,
          )
        ) {
          throw new Error(LIMITE_SEMANA_MESSAGE);
        }

        const response = await criarReservaDiaria(item.id, authToken);
        const reservasDepois = await getReservasDiariasDoUsuario(usersId, authToken);
        const podeReservarMais = !isLimiteReservasDiariasNaSemanaAtingido(
          item.dataAtividade,
          reservasDepois,
          atividadesId,
          limiteSemana,
        );

        await fetchHorarios({ refreshing: true });

        return { response, podeReservarMais };
      }

      if (usaMensalPorSemana && filters && item.semana != null) {
        const reservasAtualizadas = await getReservasMensalPorSemanaLimiteSemanalUsuario(
          usersId,
          filters.academias_id,
          authToken,
        );

        reservasMensalPorSemanaRef.current = reservasAtualizadas;
        setReservasMensalPorSemana(reservasAtualizadas);

        if (
          isSemanaMensalPorSemanaLimiteAtingido(
            item.semana,
            reservasAtualizadas,
            allHorariosRef.current,
            filters.academias_id,
            limiteSemana,
            referenceDate,
            filters.atividades_id,
          )
        ) {
          throw new Error(LIMITE_SEMANA_MESSAGE);
        }
      }

      const response = await confirmarReservaHorario(
        item,
        usersId,
        authToken,
        academiaRef.current,
        responsavelActor,
        { usaMensalPorSemana: true, atividade: atividadeRef.current },
      );

      let podeReservarMais = false;

      if (usaMensalPorSemana && filters && item.semana != null && limiteSemana != null && limiteSemana > 0) {
        const reservasAposReserva = await getReservasMensalPorSemanaLimiteSemanalUsuario(
          usersId,
          filters.academias_id,
          authToken,
        );

        reservasMensalPorSemanaRef.current = reservasAposReserva;
        setReservasMensalPorSemana(reservasAposReserva);

        podeReservarMais = !isSemanaMensalPorSemanaLimiteAtingido(
          item.semana,
          reservasAposReserva,
          allHorariosRef.current,
          filters.academias_id,
          limiteSemana,
          referenceDate,
          filters.atividades_id,
        );
      }

      // Atualiza o mapa com o estado real do backend após criar a reserva.
      await fetchHorarios({ refreshing: true });

      return { response, podeReservarMais };
    },
    [authToken, fetchHorarios, filters, referenceDate],
  );

  const confirmarReservaSemanal = useCallback(
    async (
      item: MapaSemanalItem,
      usersId: number,
    ): Promise<{ response: CriarReservaResponse; podeReservarMais: boolean }> => {
      if (!authToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!atividadeRef.current && filters?.atividades_id) {
        atividadeRef.current = await getAtividadeById(filters.atividades_id, authToken);
        setAtividade(atividadeRef.current);
      }

      if (!item?.id || item.id <= 0 || !usersId) {
        throw new Error('Selecione um horário disponível para reservar.');
      }

      if (!item.disponivel || item.capacidade <= 0) {
        throw new Error(CAPACIDADE_ESGOTADA_MESSAGE);
      }

      const limiteSemana = resolveLimiteReservasSemana({
        atividade: atividadeRef.current,
      });
      const atividadesId = filters?.atividades_id ?? item.atividades_id;
      const reservasAtuais = await getReservasSemanaisDoUsuario(usersId, authToken);

      if (isLimiteReservasSemanaisAtingido(reservasAtuais, atividadesId, limiteSemana)) {
        throw new Error(LIMITE_SEMANAL_MESSAGE);
      }

      const response = await criarReservaSemanal(item.id, authToken);
      const reservasDepois = await getReservasSemanaisDoUsuario(usersId, authToken);
      const podeReservarMais = !isLimiteReservasSemanaisAtingido(
        reservasDepois,
        atividadesId,
        limiteSemana,
      );

      await fetchHorarios({ refreshing: true });

      return { response, podeReservarMais };
    },
    [authToken, fetchHorarios, filters],
  );

  const refetchOnFocus = useCallback(() => {
    if (allHorariosRef.current.length > 0 || horariosSemanalRef.current.length > 0) {
      void fetchHorarios({ silent: true, force: true });
      return;
    }

    void fetchHorarios();
  }, [fetchHorarios]);

  const selectSemana = useCallback(
    (semana: number) => {
      const usaMensalPorSemana = resolveUsaMensalPorSemana({
        atividade: atividadeRef.current,
      });

      if (!filters || !usaMensalPorSemana) {
        setSelectedSemana(semana);
        return;
      }

      if (
        isSemanaMensalPorSemanaLimiteAtingido(
          semana,
          reservasMensalPorSemanaRef.current,
          allHorariosRef.current,
          filters.academias_id,
          resolveLimiteReservasSemana({
            atividade: atividadeRef.current,
          }),
          referenceDate,
          filters.atividades_id,
        )
      ) {
        return;
      }

      setSelectedSemana(semana);
      void fetchHorarios({ refreshing: true });
    },
    [fetchHorarios, filters, referenceDate],
  );

  const handleLiberacaoReached = useCallback(() => {
    setReferenceDate(getServerDate());
    void fetchHorarios({ silent: true, force: true });
  }, [fetchHorarios]);

  const clearSelectedSemana = useCallback(() => {
    setSelectedSemana(null);
  }, []);

  const selectUnidade = useCallback((unidadeId: number) => {
    setSelectedUnidadeId(unidadeId);
  }, []);

  useEffect(() => {
    setSelectedSemana(null);
    setSelectedUnidadeId(null);
  }, [academiasId, atividadesId, reservationTargetUserId]);

  useEffect(() => {
    setSelectedUnidadeId((current) => resolveInitialAtividadeUnidadeTabId(unidadeTabs, current));
  }, [unidadeTabs]);

  useEffect(() => {
    if (!usaMensalPorSemana || selectedSemana != null) {
      return;
    }

    const semanasSelecionaveis = semanaOptions.filter((option) => option.selecionavel);

    if (semanasSelecionaveis.length !== 1) {
      return;
    }

    setSelectedSemana(semanasSelecionaveis[0].semana);
  }, [semanaOptions, selectedSemana, usaMensalPorSemana]);

  useEffect(() => {
    if (!usaMensalPorSemana || selectedSemana == null) {
      return;
    }

    const semanaAtual = semanaOptions.find((option) => option.semana === selectedSemana);

    if (semanaAtual && !semanaAtual.selecionavel) {
      setSelectedSemana(null);
    }
  }, [selectedSemana, semanaOptions, usaMensalPorSemana]);

  useEffect(() => {
    if (proximaLiberacao == null) {
      return;
    }

    const delay = proximaLiberacao - getServerNow() + LIBERACAO_REFRESH_DELAY_MS;

    if (delay <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      handleLiberacaoReached();
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [handleLiberacaoReached, proximaLiberacao]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setReferenceDate(getServerDate());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!authToken || !filters) {
      return;
    }

    const intervalId = setInterval(() => {
      void fetchHorarios({ silent: true });
    }, MAPA_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [authToken, fetchHorarios, filters]);

  const emptyMessage = useMemo(() => {
    if (!isReady) {
      return 'Selecione uma atividade para visualizar os horários.';
    }

    if (isAguardandoLiberacao) {
      // Tela de aguardo: só countdown (sem mensagem de “sem semanas”).
      return '';
    }

    if (usaMensalPorSemana && selectedSemana == null && semanaOptions.length === 0) {
      return EMPTY_SEMANA_MESSAGE;
    }

    if (proximaLiberacao != null && referenceDate.getTime() < proximaLiberacao) {
      return 'Os horários ainda não foram liberados para reserva nesta atividade.';
    }

    return EMPTY_MESSAGE;
  }, [
    isAguardandoLiberacao,
    isReady,
    proximaLiberacao,
    referenceDate,
    selectedSemana,
    semanaOptions.length,
    usaMensalPorSemana,
  ]);

  const showSemanaSelector =
    usaMensalPorSemana &&
    temHorarioLiberado &&
    selectedSemana == null &&
    semanaOptions.length > 0 &&
    !isLoading &&
    !loadError &&
    !isAguardandoLiberacao;

  return {
    horarios,
    proximaLiberacao,
    isAguardandoLiberacao,
    isLoading,
    isRefreshing,
    loadError,
    emptyMessage,
    isReady,
    academia,
    padrao,
    usaMensalPorSemana,
    horariosSemanal: horariosSemanalVisiveis,
    semanaOptions,
    selectedSemana,
    showSemanaSelector,
    unidadeTabs,
    selectedUnidadeId,
    fetchHorarios,
    refetchOnFocus,
    handleLiberacaoReached,
    confirmarReserva,
    confirmarReservaSemanal,
    selectSemana,
    selectUnidade,
    clearSelectedSemana,
  };
}

export const RESERVAR_HORARIO_MESSAGES = {
  loadError: LOAD_ERROR,
  empty: EMPTY_MESSAGE,
  emptySemana: EMPTY_SEMANA_MESSAGE,
  success: 'Horário reservado com sucesso.',
  processing: 'Processando o seu pedido de reserva',
  selectUsuarioRequired: 'Selecione o usuário que receberá a reserva.',
};
