import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthButton } from '@/components/auth-button';
import { MapaMensalPorSemanaGrid } from '@/components/mapa-mensal-por-semana-grid';
import { MapaMensalPorSemanaSemanaSelector } from '@/components/mapa-mensal-por-semana-selector';
import { MapaDiarioFuturoList } from '@/components/mapa-diario-futuro-list';
import { MapaSemanalGrid } from '@/components/mapa-semanal-grid';
import { MapaDiarioUnidadeTabs } from '@/components/mapa-diario-unidade-tabs';
import { MapaLiberacaoCountdown } from '@/components/mapa-liberacao-countdown';
import { MeusLocaisModal } from '@/components/meus-locais-modal';
import { OkMessageModal } from '@/components/ok-message-modal';
import { ScreenHeader, ScreenHeaderDivider } from '@/components/screen-header';
import { UsuarioAutocomplete } from '@/components/usuario-autocomplete';
import { WebScreenContainer } from '@/components/web-screen-container';
import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';
import { useAppDialog } from '@/contexts/app-dialog-context';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import { useUserContext } from '@/contexts/user-context';
import {
  RESERVAR_HORARIO_MESSAGES,
  useReservarHorarioScreen,
} from '@/hooks/use-reservar-horario-screen';
import { createClubUsersCache } from '@/services/club-users-service';
import type { SelectedClubUser } from '@/types/game-players';
import {
  CRIAR_RESERVA_RESULTADO,
  getCriarReservaModalTitle,
} from '@/constants/criar-reserva-messages';
import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import type { MapaSemanalItem } from '@/types/mapa-semanal';
import type { CriarReservaResponse } from '@/types/reserva';
import { formatDiaSemanaLabel, formatHoraMinutos } from '@/utils/atividade-programacao';
import {
  CAPACIDADE_ESGOTADA_MESSAGE,
  formatMapaDiarioFuturoDataLabel,
  mapaDiarioFuturoTemCapacidadeDisponivel,
} from '@/utils/mapa-diario-futuro';
import {
  resolveReservaErrorMessage,
  resolveReservaOutcome,
} from '@/utils/reserva';
import { navigateToHome } from '@/utils/auth-navigation';
import { isModuloAtivoNaAcademia } from '@/utils/academia-permissoes-gestor';

const COLORS = {
  background: '#FFFFFF',
  navy: '#3A2154',
  blue: '#0F7A6C',
  error: '#D64545',
  muted: '#5C6475',
};

function parseRouteId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseRouteText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw?.trim() ?? '';
}

export default function ReservarHorarioScreen() {
  const router = useRouter();
  const { showToast, hideToast } = useAppToast();
  const { confirm } = useAppDialog();
  const params = useLocalSearchParams<{
    academiasId?: string;
    atividadesId?: string;
    atividadeNome?: string;
    localNome?: string;
    observacao?: string;
  }>();
  const { user, authToken, isLoading: isAuthLoading, signOut } = useAuth();
  const { effectiveAcademiasId, currentAcademia, permissions, isLoading: isContextLoading } =
    useUserContext();

  const atividadesId = parseRouteId(params.atividadesId);
  const atividadeNome = parseRouteText(params.atividadeNome) || 'Atividade';
  const localNome =
    parseRouteText(params.localNome) || currentAcademia?.nome || 'Local';
  const academiasId = effectiveAcademiasId;

  const [isReserving, setIsReserving] = useState(false);
  const [isMeusLocaisVisible, setIsMeusLocaisVisible] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<SelectedClubUser | null>(null);
  const [usuarioSelectionError, setUsuarioSelectionError] = useState<string | null>(null);
  const clubUsersCacheRef = useRef(createClubUsersCache());
  const isReservingRef = useRef(false);
  const [responseModal, setResponseModal] = useState<{ title: string; message: string } | null>(
    null,
  );

  const isGestorReserva =
    permissions.gestor &&
    !permissions.administrador &&
    isModuloAtivoNaAcademia(
      { permissoesGestor: currentAcademia?.permissoesGestor ?? {} },
      'reservarParaTerceiro',
    );
  const reservationTargetUserId = isGestorReserva
    ? selectedUsuario?.users_id ?? null
    : user?.id ?? null;
  const canSelectHorario = !isGestorReserva || selectedUsuario != null;

  const handleUnauthorized = useCallback(async () => {
    await signOut();
    router.replace('/login');
  }, [router, signOut]);

  const {
    horarios,
    proximaLiberacao,
    isAguardandoLiberacao,
    isLoading,
    isRefreshing,
    loadError,
    emptyMessage,
    isReady,
    padrao,
    usaMensalPorSemana,
    horariosSemanal,
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
  } = useReservarHorarioScreen({
    userId: user?.id ?? null,
    reservationTargetUserId,
    academiasId,
    atividadesId,
    authToken,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (isAuthLoading || isContextLoading || !user) {
      return;
    }

    if (!permissions.podeUsarLocal || !academiasId || !atividadesId) {
      router.replace('/');
    }
  }, [
    academiasId,
    atividadesId,
    isAuthLoading,
    isContextLoading,
    permissions.podeUsarLocal,
    router,
    user,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthLoading || isContextLoading || !user || !authToken || !isReady) {
        return;
      }

      if (isGestorReserva && !reservationTargetUserId) {
        return;
      }

      refetchOnFocus();
    }, [
      authToken,
      isAuthLoading,
      isContextLoading,
      isGestorReserva,
      isReady,
      refetchOnFocus,
      reservationTargetUserId,
      user,
    ]),
  );

  const responsavelActor = useMemo(
    () =>
      user
        ? {
            usersId: user.id,
            nome: user.nome,
          }
        : null,
    [user],
  );

  function handleSelectUsuario(usuario: SelectedClubUser) {
    setSelectedUsuario(usuario);
    setUsuarioSelectionError(null);
  }

  function handleClearUsuario() {
    setSelectedUsuario(null);
  }

  function handleCloseResponseModal() {
    setResponseModal(null);
    navigateToHome(router);
  }

  async function executarReserva(
    reservar: () => Promise<{ response: CriarReservaResponse; podeReservarMais: boolean }>,
  ) {
    if (!user || !authToken || !responsavelActor || isReserving || isReservingRef.current) {
      return;
    }

    isReservingRef.current = true;
    setIsReserving(true);
    showToast(RESERVAR_HORARIO_MESSAGES.processing, {
      variant: 'info',
      duration: 120_000,
    });

    let reservationSucceeded = false;

    try {
      const { response, podeReservarMais } = await reservar();

      const outcome = resolveReservaOutcome(response);

      if (outcome.sucesso === CRIAR_RESERVA_RESULTADO.sucesso) {
        reservationSucceeded = true;
        hideToast();

        if (!podeReservarMais) {
          clearSelectedSemana();
        }

        showToast(RESERVAR_HORARIO_MESSAGES.success, {
          variant: 'success',
          placement: 'center',
          duration: 2_500,
        });

        return;
      }

      if (outcome.showModal) {
        setResponseModal({
          title: getCriarReservaModalTitle(outcome.sucesso),
          message: outcome.message,
        });
      }

      if (outcome.refreshMapa) {
        await fetchHorarios({ refreshing: true });
      }
    } catch (error) {
      setResponseModal({
        title: getCriarReservaModalTitle(null),
        message: resolveReservaErrorMessage(error),
      });
    } finally {
      isReservingRef.current = false;
      setIsReserving(false);

      if (!reservationSucceeded) {
        hideToast();
      }
    }
  }

  async function handleSelectHorario(item: MapaDiarioFuturoItem) {
    if (!user || !authToken || isReserving || isReservingRef.current) {
      return;
    }

    if (!mapaDiarioFuturoTemCapacidadeDisponivel(item)) {
      setResponseModal({
        title: getCriarReservaModalTitle(null),
        message: CAPACIDADE_ESGOTADA_MESSAGE,
      });
      void fetchHorarios({ refreshing: true });
      return;
    }

    if (isGestorReserva && !selectedUsuario) {
      setUsuarioSelectionError(RESERVAR_HORARIO_MESSAGES.selectUsuarioRequired);
      return;
    }

    const targetUsersId = isGestorReserva ? selectedUsuario!.users_id : user.id;

    if (!responsavelActor) {
      return;
    }

    if (padrao === 'Diaria') {
      isReservingRef.current = true;

      try {
        const accepted = await confirm({
          title: 'Confirmar reserva',
          message: `Reservar ${atividadeNome} em ${formatMapaDiarioFuturoDataLabel(item.dataAtividade)}?`,
          confirmLabel: 'Reservar',
          cancelLabel: 'Voltar',
        });

        if (!accepted) {
          return;
        }
      } finally {
        isReservingRef.current = false;
      }
    }

    await executarReserva(() => confirmarReserva(item, targetUsersId, responsavelActor));
  }

  async function handleSelectHorarioSemanal(item: MapaSemanalItem) {
    if (!user || !authToken || isReserving || isReservingRef.current) {
      return;
    }

    if (!item.disponivel || item.capacidade <= 0) {
      setResponseModal({
        title: getCriarReservaModalTitle(null),
        message: CAPACIDADE_ESGOTADA_MESSAGE,
      });
      void fetchHorarios({ refreshing: true });
      return;
    }

    if (isGestorReserva && !selectedUsuario) {
      setUsuarioSelectionError(RESERVAR_HORARIO_MESSAGES.selectUsuarioRequired);
      return;
    }

    const targetUsersId = isGestorReserva ? selectedUsuario!.users_id : user.id;
    isReservingRef.current = true;

    try {
      const accepted = await confirm({
        title: 'Confirmar reserva',
        message: `Reservar ${atividadeNome} ${formatDiaSemanaLabel(item.diaSemana)} às ${formatHoraMinutos(item.hora, item.minutos)}?`,
        confirmLabel: 'Reservar',
        cancelLabel: 'Voltar',
      });

      if (!accepted) {
        return;
      }
    } finally {
      isReservingRef.current = false;
    }

    await executarReserva(() => confirmarReservaSemanal(item, targetUsersId));
  }

  if (isAuthLoading || isContextLoading || !user) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
        <WebScreenContainer maxWidth={WEB_MAX_CONTENT_WIDTH}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        </WebScreenContainer>
      </SafeAreaView>
    );
  }

  function renderLiberacaoCountdown(options?: { enabled?: boolean }) {
    return (
      <MapaLiberacaoCountdown
        nextLiberacao={proximaLiberacao}
        enabled={options?.enabled ?? true}
        onLiberacaoReached={handleLiberacaoReached}
      />
    );
  }

  function renderVoltarButton() {
    return (
      <AuthButton
        label="Voltar"
        variant="voltar"
        onPress={() => navigateToHome(router)}
        disabled={isReserving}
        style={styles.voltarButton}
      />
    );
  }

  function renderSemanaSelector() {
    return (
      <MapaMensalPorSemanaSemanaSelector
        atividadeNome={atividadeNome}
        semanas={semanaOptions}
        isBusy={isReserving}
        onSelectSemana={selectSemana}
        onVoltar={() => navigateToHome(router)}
      />
    );
  }

  function renderMapaList(items: MapaDiarioFuturoItem[]) {
    return (
      <>
        {usaMensalPorSemana ? (
          <>
            <Text style={styles.mensalActivityName}>{atividadeNome}</Text>
            <Text style={styles.mensalInstruction}>Clique na data para reservar</Text>
            <MapaDiarioUnidadeTabs
              tabs={unidadeTabs}
              selectedId={selectedUnidadeId}
              onSelect={selectUnidade}
              disabled={isReserving}
            />
            <View style={styles.mensalActionsRow}>
              <Pressable
                style={styles.mensalActionButton}
                onPress={() => navigateToHome(router)}
                disabled={isReserving}>
                <Text style={styles.mensalActionText}>Voltar</Text>
              </Pressable>
              {selectedSemana != null ? (
                <Pressable
                  style={styles.mensalActionButton}
                  onPress={clearSelectedSemana}
                  disabled={isReserving}>
                  <Text style={styles.mensalActionText}>Trocar semana</Text>
                </Pressable>
              ) : (
                <View style={styles.mensalActionButton} />
              )}
            </View>
            <MapaMensalPorSemanaGrid
              horarios={items}
              isBusy={isReserving || !canSelectHorario}
              showVoltarButton={false}
              onSelectHorario={(item) => void handleSelectHorario(item)}
            />
          </>
        ) : (
          <>
            <MapaDiarioUnidadeTabs
              tabs={unidadeTabs}
              selectedId={selectedUnidadeId}
              onSelect={selectUnidade}
              disabled={isReserving}
            />
            <MapaDiarioFuturoList
              atividadeNome={atividadeNome}
              horarios={items}
              isBusy={isReserving || !canSelectHorario}
              onSelectHorario={(item) => void handleSelectHorario(item)}
            />
          </>
        )}
      </>
    );
  }

  function renderContent() {
    if (!isReady) {
      return null;
    }

    if (isLoading && !isRefreshing) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.blue} />
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable style={styles.retryButton} onPress={() => void fetchHorarios()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    if (padrao === 'Semanal') {
      if (horariosSemanal.length === 0) {
        return (
          <>
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
            {renderVoltarButton()}
          </>
        );
      }

      return (
        <>
          <Text style={styles.mensalActivityName}>{atividadeNome}</Text>
          <Text style={styles.mensalInstruction}>Clique na data para reservar</Text>
          <MapaDiarioUnidadeTabs
            tabs={unidadeTabs}
            selectedId={selectedUnidadeId}
            onSelect={selectUnidade}
            disabled={isReserving}
          />
          <View style={styles.mensalActionsRow}>
            <Pressable
              style={styles.mensalActionButton}
              onPress={() => navigateToHome(router)}
              disabled={isReserving}>
              <Text style={styles.mensalActionText}>Voltar</Text>
            </Pressable>
            <View style={styles.mensalActionButton} />
          </View>
          <MapaSemanalGrid
            horarios={horariosSemanal}
            isBusy={isReserving || !canSelectHorario}
            onSelectHorario={(item) => void handleSelectHorarioSemanal(item)}
          />
        </>
      );
    }

    if (isAguardandoLiberacao) {
      return (
        <>
          <View style={styles.centerContent}>
            <View style={styles.liberacaoCountdownWrap}>
              {renderLiberacaoCountdown({ enabled: true })}
            </View>
          </View>
          {renderVoltarButton()}
        </>
      );
    }

    if (showSemanaSelector) {
      return renderSemanaSelector();
    }

    if (horarios.length === 0) {
      return (
        <>
          {renderLiberacaoCountdown()}
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
          {renderVoltarButton()}
        </>
      );
    }

    return (
      <>
        {renderLiberacaoCountdown()}
        {renderMapaList(horarios)}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <WebScreenContainer maxWidth={WEB_MAX_CONTENT_WIDTH} style={styles.screenContainer}>
        <ScreenHeader user={user} title={'Reservar\nHorário'} />
        <ScreenHeaderDivider />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            isReady ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void fetchHorarios({ refreshing: true })}
                tintColor={COLORS.blue}
                colors={[COLORS.blue]}
                enabled={!isReserving}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}>
          {isGestorReserva && academiasId && authToken ? (
            <View style={styles.gestorSelectorSection}>
              <UsuarioAutocomplete
                label="Reservar para"
                academiasId={academiasId}
                authToken={authToken}
                selectedUser={selectedUsuario}
                excludedUserIds={user ? [user.id] : []}
                onSelect={handleSelectUsuario}
                onClear={handleClearUsuario}
                cache={clubUsersCacheRef.current}
              />
              {usuarioSelectionError ? (
                <Text style={styles.selectionErrorText}>{usuarioSelectionError}</Text>
              ) : null}
              {!selectedUsuario ? (
                <Text style={styles.helperText}>
                  Selecione o usuário que receberá a reserva antes de escolher o horário.
                </Text>
              ) : null}
            </View>
          ) : null}
          {renderContent()}
        </ScrollView>

        <MeusLocaisModal
          visible={isMeusLocaisVisible}
          user={user}
          onClose={() => setIsMeusLocaisVisible(false)}
        />

        <OkMessageModal
          visible={responseModal != null}
          title={responseModal?.title ?? getCriarReservaModalTitle(null)}
          message={responseModal?.message ?? ''}
          onClose={handleCloseResponseModal}
        />

        {isReserving ? <View style={styles.blockingOverlay} pointerEvents="auto" /> : null}
      </WebScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    minHeight: 220,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  liberacaoCountdownWrap: {
    width: '100%',
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.blue,
    textDecorationLine: 'underline',
  },
  voltarButton: {
    marginTop: 24,
    alignSelf: 'center',
    maxWidth: 280,
  },
  mensalActivityName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  mensalInstruction: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  mensalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  mensalActionButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  mensalActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blue,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  gestorSelectorSection: {
    marginBottom: 20,
    gap: 8,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectionErrorText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
    textAlign: 'center',
  },
});
