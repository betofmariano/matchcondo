import { useEffect, useRef, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeCompromissosSection } from '@/components/home-compromissos-section';
import {
  HomePatrocinadoresFooter,
} from '@/components/home-patrocinadores-footer';
import { HomeHeader, HomeHeaderDivider } from '@/components/home-header';
import { GuiaInstalacaoSelecaoModal } from '@/components/guia-instalacao-selecao-modal';
import { InstalarAppLoginModal } from '@/components/instalar-app-login-modal';
import { LogoutConfirmModal } from '@/components/logout-confirm-modal';
import { MeusLocaisModal } from '@/components/meus-locais-modal';
import { PassoAPassoInstalarModal } from '@/components/passo-a-passo-instalar-modal';
import { SelecionarAtividadeReservaModal } from '@/components/selecionar-atividade-reserva-modal';
import { MenuActionButton } from '@/components/menu-action-button';
import { PublicidadeModal } from '@/components/publicidade-modal';
import { WebScreenContainer } from '@/components/web-screen-container';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import { useUserContext } from '@/contexts/user-context';
import { HomeLocalContextBar } from '@/components/home-local-context-bar';
import { SelecionarLocalPrioritarioModal } from '@/components/selecionar-local-prioritario-modal';
import {
  getGuiaInstalacaoById,
  type GuiaInstalacao,
  type GuiaInstalacaoId,
} from '@/constants/guia-instalacao';
import { useHomeAdvertisement } from '@/hooks/use-home-advertisement';
import { useHomeUltimoAcesso } from '@/hooks/use-home-ultimo-acesso';
import { useHomePatrocinadoresFooter } from '@/hooks/use-home-patrocinadores-footer';
import { useHomeSummary } from '@/hooks/use-home-summary';
import { useUserAcademiaSemPublicidade } from '@/hooks/use-user-academia-sem-publicidade';
import { useAdministracaoMenuAccess } from '@/hooks/use-administracao-menu-access';
import { useListaReservasAccess } from '@/hooks/use-lista-reservas-access';
import { useListaEsperaAccess } from '@/hooks/use-lista-espera-access';
import { registrarImpressaoBanner } from '@/services/publicidade-service';
import { HOME_MAX_BUTTON_WIDTH } from '@/constants/web-layout';
import { getGreeting } from '@/utils/get-greeting';
import {
  consumePasswordLoginInstallPrompt,
  hasPasswordLoginInstallPrompt,
} from '@/utils/instalar-app-login-prompt';
import { isRunningAsInstalledApp } from '@/utils/is-running-as-installed-app';
import { openWhatsAppSuporte, WHATSAPP_SUPORTE_OPEN_ERROR } from '@/utils/open-whatsapp-suporte';
import { formatBrazilianMobilePhone } from '@/utils/phone-mask';
import { getAdministracaoEntryButtonLabel, shouldShowUsuariosInHeaderMenu } from '@/utils/club-config';
import { getHomeMenuButtonMetrics } from '@/utils/home-menu-button';
import { getHomePatrocinadoresFooterHeight } from '@/utils/home-patrocinadores-footer-metrics';
import { getWebConstrainedWidth } from '@/utils/web-layout';
import type { Patrocinador } from '@/types/publicidade';
import { PUBLICIDADE_DISPLAY_BANNER_RODAPE } from '@/utils/publicidade-display';
import { shouldOcultarPublicidade } from '@/utils/academia-publicidade';
import { getPatrocinadorBannerImageUrl, getPatrocinadorLogoImageUrl } from '@/utils/publicidade-patrocinador';

const COLORS = {
  background: '#FFFFFF',
  navy: '#3A2154',
  gold: '#E8B830',
  blue: '#0F7A6C',
  black: '#000000',
  white: '#FFFFFF',
  muted: '#5C6475',
};

const BUTTON_GAP = 18;

export default function HomeScreen() {
  const router = useRouter();
  const { reservaSucesso, loginSenha } = useLocalSearchParams<{
    reservaSucesso?: string;
    loginSenha?: string;
  }>();
  const { showToast } = useAppToast();
  const { width } = useWindowDimensions();
  const { user, authToken, isLoading, signOut, patchUser } = useAuth();
  const {
    effectiveAcademiasId,
    currentAcademia,
    selectableUserLocals,
    selectLocalPrioritario,
    isSelectingLocal,
    selectLocalError,
    isLoading: isUserContextLoading,
    permissions,
  } = useUserContext();
  const [isMeusLocaisVisible, setIsMeusLocaisVisible] = useState(false);
  const [isTrocarLocalVisible, setIsTrocarLocalVisible] = useState(false);
  const [isGuiaSelecaoVisible, setIsGuiaSelecaoVisible] = useState(false);
  const [isInstalarAppLoginVisible, setIsInstalarAppLoginVisible] = useState(false);
  const dismissedInstalarAppLoginRef = useRef(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [guiaInstalacaoAtivo, setGuiaInstalacaoAtivo] = useState<GuiaInstalacao | null>(null);
  const [isAtividadeModalVisible, setIsAtividadeModalVisible] = useState(false);
  const [hasCompromissoCriticalModal, setHasCompromissoCriticalModal] = useState(false);
  const [footerPatrocinador, setFooterPatrocinador] = useState<Patrocinador | null>(null);
  const [footerBannerVisible, setFooterBannerVisible] = useState(false);
  const buttonWidth = Math.min(getWebConstrainedWidth(width) * 0.8, HOME_MAX_BUTTON_WIDTH);
  const menuButtonMetrics = getHomeMenuButtonMetrics(width);

  const {
    proximaReserva,
    proximaListaEspera,
    reservas,
    isLoading: isSummaryLoading,
    isRefreshing,
    reservasError,
    listaEsperaError,
    loadSummary,
    removeReserva,
  } = useHomeSummary({
    userId: user?.id,
    academiasId: effectiveAcademiasId ?? undefined,
    authToken,
  });

  const { showAdministracaoEntry: showAdministracaoButton, isCheckingAccess: isCheckingAdministracaoAccess } =
    useAdministracaoMenuAccess(user);

  const { canAccessListaReservas } = useListaReservasAccess();
  const { canAccessListaEspera } = useListaEsperaAccess();

  const isProfessorHomeUser =
    !permissions.administrador &&
    !permissions.gestor &&
    (permissions.professor || user?.professor === true);
  const isCommonUser =
    !permissions.administrador && !permissions.gestor && !isProfessorHomeUser;
  const showUsuarioComumHomeButtons = isCommonUser || isProfessorHomeUser;
  const isAdministradorHome = permissions.administrador;
  const isGestorHome = permissions.gestor && !permissions.administrador;
  const showMapaHorariosButton =
    (showUsuarioComumHomeButtons && effectiveAcademiasId != null) ||
    isAdministradorHome ||
    (isGestorHome && effectiveAcademiasId != null);
  const showMeusDadosButton = showUsuarioComumHomeButtons || isAdministradorHome || isGestorHome;
  const showReservarHorarioButton = !isProfessorHomeUser && !isAdministradorHome;
  const showListaUsuariosProfessorButton =
    isProfessorHomeUser &&
    user != null &&
    effectiveAcademiasId != null &&
    permissions.podeUsarLocal &&
    shouldShowUsuariosInHeaderMenu(user);
  const showAdministracaoNaHome = showAdministracaoButton && !isCheckingAdministracaoAccess;

  useHomeUltimoAcesso({ user, authToken });

  const { semPublicidade, isSemPublicidadeResolved } =
    useUserAcademiaSemPublicidade(effectiveAcademiasId);
  const ocultarPublicidade = shouldOcultarPublicidade(user, semPublicidade);

  const {
    patrocinador: patrocinadorAtual,
    visible: publicidadeVisible,
    closeAdvertisement,
    handleImpressionReady,
    handleImageError,
  } = useHomeAdvertisement({
    user,
    authToken,
    isAuthLoading: isLoading,
    semPublicidade: ocultarPublicidade,
    isSemPublicidadeResolved,
    isBlockedByCriticalModal:
      isMeusLocaisVisible ||
      isTrocarLocalVisible ||
      isGuiaSelecaoVisible ||
      isInstalarAppLoginVisible ||
      isLogoutModalVisible ||
      guiaInstalacaoAtivo != null ||
      hasCompromissoCriticalModal ||
      footerBannerVisible ||
      isAtividadeModalVisible,
    onUltimaPublicidadeDataUpdated: (timestamp) => {
      patchUser({ ultimaPublicidadeData: timestamp });
    },
  });

  const { patrocinadores: patrocinadoresFooter, showFooter: showPatrocinadoresFooter } =
    useHomePatrocinadoresFooter({ user, semPublicidade: ocultarPublicidade });

  const patrocinadoresFooterVisiveis = patrocinadoresFooter.filter((patrocinador) =>
    Boolean(getPatrocinadorLogoImageUrl(patrocinador)),
  );
  const footerHeight = getHomePatrocinadoresFooterHeight(
    width,
    patrocinadoresFooterVisiveis.length,
  );

  useEffect(() => {
    if (!ocultarPublicidade) {
      return;
    }

    setFooterBannerVisible(false);
    setFooterPatrocinador(null);
    closeAdvertisement();
  }, [closeAdvertisement, ocultarPublicidade]);

  function handleFooterPatrocinadorPress(patrocinador: Patrocinador) {
    if (ocultarPublicidade) {
      return;
    }

    if (!getPatrocinadorBannerImageUrl(patrocinador)) {
      return;
    }

    setFooterPatrocinador(patrocinador);
    setFooterBannerVisible(true);
  }

  function handleCloseFooterBanner() {
    setFooterBannerVisible(false);
    setFooterPatrocinador(null);
  }

  function handleFooterImpressionReady() {
    if (!user?.id || !footerPatrocinador) {
      return;
    }

    void registrarImpressaoBanner({
      user,
      patrocinador: footerPatrocinador,
      display: PUBLICIDADE_DISPLAY_BANNER_RODAPE,
    });
  }

  useEffect(() => {
    if (reservaSucesso !== '1') {
      return;
    }

    showToast('Horário reservado com sucesso.', { variant: 'success' });
    void loadSummary({ refreshing: true });
    router.setParams({ reservaSucesso: undefined });
  }, [loadSummary, reservaSucesso, router, showToast]);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    const fromParam = loginSenha === '1';

    if (fromParam) {
      router.setParams({ loginSenha: undefined });
    }

    if (dismissedInstalarAppLoginRef.current) {
      consumePasswordLoginInstallPrompt();
      return;
    }

    if (isRunningAsInstalledApp()) {
      consumePasswordLoginInstallPrompt();
      return;
    }

    if (!fromParam && !hasPasswordLoginInstallPrompt()) {
      return;
    }

    setIsInstalarAppLoginVisible(true);
  }, [isLoading, loginSenha, router, user]);

  function handleDismissInstalarAppLogin() {
    dismissedInstalarAppLoginRef.current = true;
    consumePasswordLoginInstallPrompt();
    setIsInstalarAppLoginVisible(false);
  }

  function handleSeeInstalarAppGuide() {
    dismissedInstalarAppLoginRef.current = true;
    consumePasswordLoginInstallPrompt();
    setIsInstalarAppLoginVisible(false);
    setIsGuiaSelecaoVisible(true);
  }

  function handleRetryReservas() {
    void loadSummary({ refreshing: true });
  }

  function handleRetryListaEspera() {
    void loadSummary({ refreshing: true });
  }

  if (isLoading || !user || isUserContextLoading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
        <WebScreenContainer>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        </WebScreenContainer>
      </SafeAreaView>
    );
  }

  const greeting = `${getGreeting()}, ${user.nome}!`;

  function renderListaUsuariosProfessorButton(withTopMargin: boolean) {
    if (!showListaUsuariosProfessorButton) {
      return null;
    }

    return (
      <MenuActionButton
        label="Lista de Usuários"
        backgroundColor={COLORS.blue}
        textColor={COLORS.white}
        width={buttonWidth}
        fontSize={menuButtonMetrics.fontSize}
        buttonHeight={menuButtonMetrics.buttonHeight}
        iconContainerWidth={menuButtonMetrics.iconContainerWidth}
        paddingHorizontal={menuButtonMetrics.paddingHorizontal}
        icon={
          <Ionicons
            name="people-outline"
            size={menuButtonMetrics.iconSize}
            color={COLORS.white}
          />
        }
        style={withTopMargin ? { marginTop: BUTTON_GAP } : undefined}
        onPress={() => router.push('/usuarios')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <WebScreenContainer>
        <View style={styles.pageContent}>
        <HomeHeader user={user} />
        <HomeHeaderDivider />

        <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          showPatrocinadoresFooter ? { paddingBottom: footerHeight + 16 } : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadSummary({ refreshing: true })}
            tintColor={COLORS.blue}
            colors={[COLORS.blue]}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{greeting}</Text>

        {!permissions.administrador ? (
          <HomeLocalContextBar
            localNome={currentAcademia?.nome ?? null}
            canSwitchLocal={selectableUserLocals.length > 1}
            onPressSwitchLocal={() => setIsTrocarLocalVisible(true)}
          />
        ) : null}

        <HomeCompromissosSection
          reservas={reservas}
          proximaReserva={proximaReserva}
          proximaListaEspera={proximaListaEspera}
          totalReservas={reservas.length}
          isLoading={isSummaryLoading}
          reservasError={reservasError}
          listaEsperaError={listaEsperaError}
          canAccessListaEspera={canAccessListaEspera}
          showLocalColumn={selectableUserLocals.length > 1}
          user={user}
          authToken={authToken}
          onRetryReservas={handleRetryReservas}
          onRetryListaEspera={handleRetryListaEspera}
          onRefresh={() => void loadSummary({ silent: true })}
          onReservaRemoved={removeReserva}
          onCriticalModalVisibilityChange={setHasCompromissoCriticalModal}
        />

        <View style={styles.buttonsContainer}>
          {showListaUsuariosProfessorButton
            ? renderListaUsuariosProfessorButton(false)
            : null}

          {showAdministracaoNaHome ? (
            <MenuActionButton
              label={getAdministracaoEntryButtonLabel(user)}
              backgroundColor={COLORS.blue}
              textColor={COLORS.white}
              width={buttonWidth}
              fontSize={menuButtonMetrics.fontSize}
              buttonHeight={menuButtonMetrics.buttonHeight}
              iconContainerWidth={menuButtonMetrics.iconContainerWidth}
              paddingHorizontal={menuButtonMetrics.paddingHorizontal}
              icon={
                <Ionicons
                  name="settings-outline"
                  size={menuButtonMetrics.iconSize}
                  color={COLORS.white}
                />
              }
              onPress={() => {
                router.push('/administracao');
              }}
            />
          ) : null}

          {showReservarHorarioButton ? (
          <MenuActionButton
            label="Reservar Horário"
            backgroundColor={COLORS.gold}
            textColor={COLORS.black}
            width={buttonWidth}
            fontSize={menuButtonMetrics.fontSize}
            buttonHeight={menuButtonMetrics.buttonHeight}
            iconContainerWidth={menuButtonMetrics.iconContainerWidth}
            paddingHorizontal={menuButtonMetrics.paddingHorizontal}
            icon={
              <Ionicons
                name="flash"
                size={menuButtonMetrics.iconSize}
                color={COLORS.black}
              />
            }
            style={
              showListaUsuariosProfessorButton || showAdministracaoNaHome
                ? { marginTop: BUTTON_GAP }
                : undefined
            }
            onPress={() => setIsAtividadeModalVisible(true)}
          />
          ) : null}

          {canAccessListaReservas ? (
            <MenuActionButton
              label="Lista de Reservas"
              backgroundColor={COLORS.blue}
              textColor={COLORS.white}
              width={buttonWidth}
              fontSize={menuButtonMetrics.fontSize}
              buttonHeight={menuButtonMetrics.buttonHeight}
              iconContainerWidth={menuButtonMetrics.iconContainerWidth}
              paddingHorizontal={menuButtonMetrics.paddingHorizontal}
              icon={
                <Ionicons
                  name="calendar-outline"
                  size={menuButtonMetrics.iconSize}
                  color={COLORS.white}
                />
              }
              style={{ marginTop: BUTTON_GAP }}
              onPress={() => router.push('/lista-reservas')}
            />
          ) : null}

          <MenuActionButton
            label="Instalação no Celular"
            backgroundColor={COLORS.blue}
            textColor={COLORS.white}
            width={buttonWidth}
            fontSize={menuButtonMetrics.fontSize}
            buttonHeight={menuButtonMetrics.buttonHeight}
            iconContainerWidth={menuButtonMetrics.iconContainerWidth}
            paddingHorizontal={menuButtonMetrics.paddingHorizontal}
            icon={
              <Ionicons
                name="phone-portrait-outline"
                size={menuButtonMetrics.iconSize}
                color={COLORS.white}
              />
            }
            style={{ marginTop: BUTTON_GAP }}
            onPress={() => setIsGuiaSelecaoVisible(true)}
          />

          {showMapaHorariosButton ? (
            <MenuActionButton
              label="Grade de Horários"
              backgroundColor={COLORS.blue}
              textColor={COLORS.white}
              width={buttonWidth}
              fontSize={menuButtonMetrics.fontSize}
              buttonHeight={menuButtonMetrics.buttonHeight}
              iconContainerWidth={menuButtonMetrics.iconContainerWidth}
              paddingHorizontal={menuButtonMetrics.paddingHorizontal}
              icon={
                <Ionicons
                  name="grid-outline"
                  size={menuButtonMetrics.iconSize}
                  color={COLORS.white}
                />
              }
              style={{ marginTop: BUTTON_GAP }}
              onPress={() => router.push('/mapa-horarios')}
            />
          ) : null}

          {showMeusDadosButton ? (
            <MenuActionButton
              label="Meus Dados"
              backgroundColor={COLORS.blue}
              textColor={COLORS.white}
              width={buttonWidth}
              fontSize={menuButtonMetrics.fontSize}
              buttonHeight={menuButtonMetrics.buttonHeight}
              iconContainerWidth={menuButtonMetrics.iconContainerWidth}
              paddingHorizontal={menuButtonMetrics.paddingHorizontal}
              icon={
                <Ionicons
                  name="person-outline"
                  size={menuButtonMetrics.iconSize}
                  color={COLORS.white}
                />
              }
              style={{ marginTop: BUTTON_GAP }}
              onPress={() => router.push('/meus-dados')}
            />
          ) : null}

          <MenuActionButton
            label="Meus Locais"
            backgroundColor={COLORS.blue}
            textColor={COLORS.white}
            width={buttonWidth}
            fontSize={menuButtonMetrics.fontSize}
            buttonHeight={menuButtonMetrics.buttonHeight}
            iconContainerWidth={menuButtonMetrics.iconContainerWidth}
            paddingHorizontal={menuButtonMetrics.paddingHorizontal}
            icon={
              <Ionicons
                name="location-outline"
                size={menuButtonMetrics.iconSize}
                color={COLORS.white}
              />
            }
            style={{ marginTop: BUTTON_GAP }}
            onPress={() => setIsMeusLocaisVisible(true)}
          />

          <MenuActionButton
            label="Ajuda no WhatsApp"
            backgroundColor="#25D366"
            textColor={COLORS.white}
            width={buttonWidth}
            fontSize={menuButtonMetrics.fontSize}
            buttonHeight={menuButtonMetrics.buttonHeight}
            iconContainerWidth={menuButtonMetrics.iconContainerWidth}
            paddingHorizontal={menuButtonMetrics.paddingHorizontal}
            icon={
              <Ionicons
                name="logo-whatsapp"
                size={menuButtonMetrics.iconSize}
                color={COLORS.white}
              />
            }
            style={{ marginTop: BUTTON_GAP }}
            onPress={() => {
              void (async () => {
                const opened = await openWhatsAppSuporte({
                  clube: currentAcademia?.nome,
                  nome: user.nome,
                  telefone:
                    formatBrazilianMobilePhone(
                      user.telefoneLimpo || user.telefoneCorrigido || user.telefone,
                    ) || null,
                });

                if (!opened) {
                  showToast(WHATSAPP_SUPORTE_OPEN_ERROR, { variant: 'error' });
                }
              })();
            }}
          />

          <Pressable
            style={styles.sairLink}
            onPress={() => setIsLogoutModalVisible(true)}
            accessibilityLabel="Sair"
            accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color={COLORS.muted} />
            <Text style={styles.sairLinkText}>Sair</Text>
          </Pressable>
        </View>
      </ScrollView>

      {showPatrocinadoresFooter ? (
        <HomePatrocinadoresFooter
          patrocinadores={patrocinadoresFooter}
          onPatrocinadorPress={handleFooterPatrocinadorPress}
        />
      ) : null}
        </View>

      <SelecionarAtividadeReservaModal
        visible={isAtividadeModalVisible}
        userId={user.id}
        onClose={() => setIsAtividadeModalVisible(false)}
        onSelect={(atividade) => {
          router.push({
            pathname: '/reservar-horario',
            params: {
              atividadesId: String(atividade.id),
              atividadeNome: atividade.nome,
              localNome: atividade.localNome,
              observacao: atividade.observacao ?? '',
            },
          });
        }}
        onAddLocal={() => {
          setIsAtividadeModalVisible(false);
          setIsMeusLocaisVisible(true);
        }}
      />

      <MeusLocaisModal
        visible={isMeusLocaisVisible}
        user={user}
        onClose={() => setIsMeusLocaisVisible(false)}
      />

      <InstalarAppLoginModal
        visible={isInstalarAppLoginVisible}
        onDismiss={handleDismissInstalarAppLogin}
        onSeeGuide={handleSeeInstalarAppGuide}
      />

      <GuiaInstalacaoSelecaoModal
        visible={isGuiaSelecaoVisible}
        onClose={() => setIsGuiaSelecaoVisible(false)}
        onSelect={(guiaId: GuiaInstalacaoId) => {
          const guia = getGuiaInstalacaoById(guiaId);
          if (!guia) {
            return;
          }

          setIsGuiaSelecaoVisible(false);
          setGuiaInstalacaoAtivo(guia);
        }}
      />

      <LogoutConfirmModal
        visible={isLogoutModalVisible}
        message={
          permissions.administrador || permissions.gestor
            ? 'Deseja encerrar sua sessão?'
            : 'Ao sair, você precisará fazer login novamente para acessar o app. Deseja continuar?'
        }
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={() => {
          setIsLogoutModalVisible(false);
          void (async () => {
            await signOut();
            router.replace('/login');
          })();
        }}
      />

      <PassoAPassoInstalarModal
        visible={guiaInstalacaoAtivo != null}
        guia={guiaInstalacaoAtivo}
        onClose={() => setGuiaInstalacaoAtivo(null)}
        onBackToSelection={() => {
          setGuiaInstalacaoAtivo(null);
          setIsGuiaSelecaoVisible(true);
        }}
      />

      <SelecionarLocalPrioritarioModal
        visible={isTrocarLocalVisible}
        userLocals={selectableUserLocals}
        isSubmitting={isSelectingLocal}
        errorMessage={selectLocalError}
        dismissible
        title="Trocar local"
        subtitle="Escolha qual local deseja usar agora no app."
        confirmLabel="Usar este local"
        onClose={() => setIsTrocarLocalVisible(false)}
        onConfirm={(academiasId) => {
          void selectLocalPrioritario(academiasId).then(() => {
            setIsTrocarLocalVisible(false);
            void loadSummary({ refreshing: true });
          });
        }}
      />

      <PublicidadeModal
        visible={publicidadeVisible && !ocultarPublicidade}
        user={user}
        patrocinador={patrocinadorAtual}
        onImpressionReady={handleImpressionReady}
        onImageError={handleImageError}
        onClose={closeAdvertisement}
      />

      <PublicidadeModal
        visible={footerBannerVisible && !ocultarPublicidade}
        user={user}
        patrocinador={footerPatrocinador}
        showCountdown={false}
        trackImpression
        trackLinkImpression
        onImpressionReady={handleFooterImpressionReady}
        onImageError={handleCloseFooterBanner}
        onClose={handleCloseFooterBanner}
      />
      </WebScreenContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pageContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  sairLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: BUTTON_GAP + 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sairLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.muted,
  },
});
