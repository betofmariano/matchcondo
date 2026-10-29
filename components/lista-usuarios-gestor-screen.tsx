import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AdminTableScrollContainer } from '@/components/admin-table-scroll-container';
import { ExcluirCadastroModal } from '@/components/excluir-cadastro-modal';
import { GestorAcademiaSelectorField } from '@/components/gestor-academia-selector-field';
import { GestorUsuarioListItemRow } from '@/components/gestor-usuario-list-item';
import { GestorUsuarioStatusFilter } from '@/components/gestor-usuario-status-filter';
import { ScreenHeader, ScreenHeaderDivider } from '@/components/screen-header';
import { UsuarioContatoModal } from '@/components/usuario-contato-modal';
import { WebScreenContainer } from '@/components/web-screen-container';
import { WEB_MAX_CONTENT_WIDTH, WEB_MAX_WIDE_CONTENT_WIDTH } from '@/constants/web-layout';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import { useUserContext } from '@/contexts/user-context';
import { useGestorAcademiaScope } from '@/hooks/use-gestor-academia-scope';
import {
  LISTA_USUARIOS_GESTOR_MESSAGES,
  useListaUsuariosGestorScreen,
} from '@/hooks/use-lista-usuarios-gestor-screen';
import type { GestorUsuarioListItem } from '@/types/usuario';
import { CLUB_ADMIN_MESSAGES } from '@/utils/club-config';
import {
  GESTOR_USUARIOS_ACTIONS_COLUMN_WIDTH,
  GESTOR_USUARIOS_ENDERECO_COLUMN_WIDTH,
  GESTOR_USUARIOS_FLAG_COLUMN_WIDTH,
  GESTOR_USUARIOS_NOME_COLUMN_WIDTH,
  GESTOR_USUARIOS_TABLE_COLUMN_GAP,
  GESTOR_USUARIOS_TABLE_HORIZONTAL_PADDING,
  GESTOR_USUARIOS_TELEFONE_COLUMN_WIDTH,
  GESTOR_USUARIOS_ULTIMA_ENTRADA_COLUMN_WIDTH,
  getGestorUsuariosTableWidth,
} from '@/utils/gestor-usuario-table-layout';

const COLORS = {
  background: '#FFFFFF',
  navy: '#3A2154',
  blue: '#0F7A6C',
  error: '#D64545',
  muted: '#5C6475',
  border: '#D5DAE3',
  highlight: '#FFF4D6',
};

const TABLE_MIN_WIDTH = getGestorUsuariosTableWidth({
  showEnderecoColumn: true,
});
const SCREEN_MAX_WIDTH = Math.max(WEB_MAX_WIDE_CONTENT_WIDTH, TABLE_MIN_WIDTH);

type PendingAction = {
  type: 'approve' | 'gestor' | 'unset-gestor' | 'delete';
  usuario: GestorUsuarioListItem;
};

export function ListaUsuariosGestorScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { user, authToken, isLoading: isAuthLoading, signOut } = useAuth();
  const {
    currentAcademia,
    permissions,
    isLoading: isContextLoading,
  } = useUserContext();

  const canAccess = permissions.gestor || permissions.administrador;

  const handleUnauthorized = useCallback(async () => {
    await signOut();
    router.replace('/login');
  }, [router, signOut]);

  const academiaScope = useGestorAcademiaScope({
    user,
    authToken,
    isAuthLoading,
    onUnauthorized: handleUnauthorized,
  });

  const academiasId = academiaScope.isAdministrador
    ? (academiaScope.selectedAcademiaId ?? currentAcademia?.id ?? null)
    : (currentAcademia?.id ?? academiaScope.academiasId);

  const [moradorParaBloquear, setMoradorParaBloquear] = useState<GestorUsuarioListItem | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [usuarioContato, setUsuarioContato] = useState<GestorUsuarioListItem | null>(null);

  const contatoUsuario = useMemo(
    () =>
      usuarioContato
        ? {
            id: usuarioContato.usersId,
            userslocalId: usuarioContato.userslocalId,
            nome: usuarioContato.nome,
            foto: null,
            telefoneLimpo: usuarioContato.telefoneLimpo,
          }
        : null,
    [usuarioContato],
  );

  const {
    usuarios,
    totalCount,
    isLoading,
    isRefreshing,
    loadError,
    searchQuery,
    statusFilter,
    isActionRunning,
    setSearchQuery,
    setStatusFilter,
    fetchUsuarios,
    approveUsuario,
    setBloqueioUsuario,
    setGestorUsuario,
    deleteUsuario,
  } = useListaUsuariosGestorScreen({
    authToken,
    academiasId,
    isAuthLoading,
    canAccess,
    isContextLoading,
    onUnauthorized: handleUnauthorized,
  });

  const previousAcademiasIdRef = useRef(academiasId);

  useEffect(() => {
    const previousAcademiasId = previousAcademiasIdRef.current;
    previousAcademiasIdRef.current = academiasId;

    if (previousAcademiasId == null || academiasId == null || previousAcademiasId === academiasId) {
      return;
    }

    setSearchQuery('');
    setStatusFilter('todos');
    setPendingAction(null);
    setActionError(null);
    setMoradorParaBloquear(null);
    setBlockError(null);
    setUsuarioContato(null);
  }, [academiasId, setSearchQuery, setStatusFilter]);

  useEffect(() => {
    if (isAuthLoading || isContextLoading || !user) {
      return;
    }

    if (!canAccess) {
      showToast(CLUB_ADMIN_MESSAGES.permission, { variant: 'error' });
      router.replace('/');
    }
  }, [canAccess, isAuthLoading, isContextLoading, router, showToast, user]);

  function openAction(type: PendingAction['type'], usuario: GestorUsuarioListItem) {
    if (isActionRunning) {
      return;
    }

    setActionError(null);
    setPendingAction({ type, usuario });
  }

  function closeAction() {
    if (isActionRunning) {
      return;
    }

    setPendingAction(null);
    setActionError(null);
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    const { type, usuario } = pendingAction;
    let result;

    if (type === 'approve') {
      result = await approveUsuario(usuario);
    } else if (type === 'gestor' || type === 'unset-gestor') {
      result = await setGestorUsuario(usuario, type === 'gestor');
    } else {
      result = await deleteUsuario(usuario);
    }

    if (!result.ok) {
      setActionError(result.mensagem);
      return;
    }

    setPendingAction(null);
    showToast(result.mensagem, { variant: 'success' });
  }

  async function handleBlockPress(usuario: GestorUsuarioListItem) {
    if (isActionRunning) {
      return;
    }

    if (usuario.bloqueado) {
      const result = await setBloqueioUsuario(usuario, false);
      showToast(result.mensagem, { variant: result.ok ? 'success' : 'error' });
      return;
    }

    setBlockError(null);
    setMoradorParaBloquear(usuario);
  }

  async function confirmBlock() {
    if (!moradorParaBloquear) {
      return;
    }

    setBlockError(null);
    const result = await setBloqueioUsuario(moradorParaBloquear, true);

    if (!result.ok) {
      setBlockError(result.mensagem);
      return;
    }

    setMoradorParaBloquear(null);
    showToast(result.mensagem, { variant: 'success' });
  }

  const pendingCopy = pendingAction
    ? pendingAction.type === 'approve'
      ? {
          title: LISTA_USUARIOS_GESTOR_MESSAGES.approveTitle,
          message: LISTA_USUARIOS_GESTOR_MESSAGES.approveMessage,
          confirmLabel: 'Aprovar',
          confirmDestructive: false,
        }
      : pendingAction.type === 'gestor'
        ? {
            title: LISTA_USUARIOS_GESTOR_MESSAGES.gestorTitle,
            message: LISTA_USUARIOS_GESTOR_MESSAGES.gestorMessage,
            confirmLabel: 'Confirmar',
            confirmDestructive: false,
          }
        : pendingAction.type === 'unset-gestor'
          ? {
              title: LISTA_USUARIOS_GESTOR_MESSAGES.unsetGestorTitle,
              message: LISTA_USUARIOS_GESTOR_MESSAGES.unsetGestorMessage,
              confirmLabel: 'Remover',
              confirmDestructive: true,
            }
          : {
              title: LISTA_USUARIOS_GESTOR_MESSAGES.deleteTitle,
              message: LISTA_USUARIOS_GESTOR_MESSAGES.deleteMessage,
              confirmLabel: 'Excluir',
              confirmDestructive: true,
            }
    : {
        title: '',
        message: '',
        confirmLabel: 'Confirmar',
        confirmDestructive: false,
      };

  if (isAuthLoading || !user || isContextLoading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
        <WebScreenContainer maxWidth={SCREEN_MAX_WIDTH}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        </WebScreenContainer>
      </SafeAreaView>
    );
  }

  const currentUserId = user.id;
  const showList = canAccess && !isLoading && !loadError && usuarios.length > 0;

  const tableHeader = (
    <View style={[styles.tableHeader, { width: TABLE_MIN_WIDTH, minWidth: TABLE_MIN_WIDTH }]}>
      <Text
        style={[
          styles.tableHeaderText,
          styles.colNome,
          { width: GESTOR_USUARIOS_NOME_COLUMN_WIDTH },
        ]}>
        Nome
      </Text>
      <Text style={[styles.tableHeaderText, styles.colTelefone]}>Telefone</Text>
      <Text
        style={[
          styles.tableHeaderText,
          styles.colEndereco,
          { width: GESTOR_USUARIOS_ENDERECO_COLUMN_WIDTH },
        ]}>
        Endereço
      </Text>
      <Text style={[styles.tableHeaderText, styles.colFlag]}>Gestor</Text>
      <Text style={[styles.tableHeaderText, styles.colFlag]}>Aprov</Text>
      <Text style={[styles.tableHeaderText, styles.colFlag]}>Bloq</Text>
      <Text style={[styles.tableHeaderText, styles.colActions]}>Ações</Text>
      <Text style={[styles.tableHeaderText, styles.colUltimaEntrada]}>Última Entrada</Text>
    </View>
  );

  function renderMainContent() {
    if (!canAccess) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>{CLUB_ADMIN_MESSAGES.permission}</Text>
        </View>
      );
    }

    if (academiasId == null) {
      return (
        <View style={styles.centerContent}>
          {academiaScope.isLoadingAcademias ? (
            <ActivityIndicator size="large" color={COLORS.blue} />
          ) : (
            <Text style={styles.emptyText}>{LISTA_USUARIOS_GESTOR_MESSAGES.selectLocal}</Text>
          )}
        </View>
      );
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
          <Pressable style={styles.retryButton} onPress={() => void fetchUsuarios()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    if (usuarios.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>{LISTA_USUARIOS_GESTOR_MESSAGES.empty}</Text>
        </View>
      );
    }

    return (
      <AdminTableScrollContainer
        minWidth={TABLE_MIN_WIDTH}
        centerWhenScreenWiderThan={WEB_MAX_CONTENT_WIDTH}>
        <FlatList
          style={[styles.list, { width: TABLE_MIN_WIDTH }]}
          data={showList ? usuarios : []}
          keyExtractor={(item) => String(item.userslocalId)}
          ListHeaderComponent={showList ? tableHeader : null}
          renderItem={({ item }) => (
            <GestorUsuarioListItemRow
              usuario={item}
              isCurrentUser={item.usersId === currentUserId}
              tableWidth={TABLE_MIN_WIDTH}
              disabled={isActionRunning}
              onApprovePress={() => openAction('approve', item)}
              onBlockPress={() => void handleBlockPress(item)}
              onGestorPress={() => openAction(item.gestor ? 'unset-gestor' : 'gestor', item)}
              onDeletePress={() => openAction('delete', item)}
              onContactPress={() => setUsuarioContato(item)}
            />
          )}
          contentContainerStyle={[styles.scrollContent, { minWidth: TABLE_MIN_WIDTH }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void fetchUsuarios({ refreshing: true })}
              tintColor={COLORS.blue}
              colors={[COLORS.blue]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </AdminTableScrollContainer>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <WebScreenContainer maxWidth={SCREEN_MAX_WIDTH} style={styles.screenContainer}>
        <ScreenHeader user={user} title={'Lista de\nUsuários'} />
        <ScreenHeaderDivider />

        <View style={styles.toolbar}>
          <GestorAcademiaSelectorField
            showAcademiaSelector={academiaScope.isAdministrador}
            availableAcademias={academiaScope.availableAcademias}
            selectedAcademiaId={academiasId}
            onChange={academiaScope.setSelectedAcademiaId}
            isLoading={academiaScope.isLoadingAcademias}
            error={academiaScope.academiasLoadError}
            onRetry={() => void academiaScope.fetchAvailableAcademias()}
            disabled={isActionRunning || !canAccess}
            localNome={academiaScope.localNome ?? currentAcademia?.nome ?? null}
            label="Local"
            placeholder="Selecione o condomínio"
            modalTitle="Selecione o condomínio"
            compact
          />

          <GestorUsuarioStatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            disabled={(isLoading && !isRefreshing) || !canAccess}
          />

          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Procurar..."
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={canAccess}
          />

          <Text style={styles.countText}>Quantidade de Usuários: {totalCount}</Text>
        </View>

        <View style={styles.listContainer}>{renderMainContent()}</View>

        <ExcluirCadastroModal
          visible={moradorParaBloquear != null}
          title={LISTA_USUARIOS_GESTOR_MESSAGES.blockTitle}
          message={
            moradorParaBloquear
              ? `Deseja bloquear ${moradorParaBloquear.nome}?`
              : LISTA_USUARIOS_GESTOR_MESSAGES.blockMessage
          }
          confirmLabel="Bloquear"
          confirmDestructive
          isDeleting={isActionRunning}
          errorMessage={blockError}
          onClose={() => {
            if (!isActionRunning) {
              setMoradorParaBloquear(null);
              setBlockError(null);
            }
          }}
          onConfirm={() => void confirmBlock()}
        />

        <ExcluirCadastroModal
          visible={pendingAction != null}
          title={pendingCopy.title}
          message={pendingCopy.message}
          confirmLabel={pendingCopy.confirmLabel}
          confirmDestructive={pendingCopy.confirmDestructive}
          isDeleting={isActionRunning}
          errorMessage={actionError}
          onClose={closeAction}
          onConfirm={() => void confirmPendingAction()}
        />

        <UsuarioContatoModal
          visible={usuarioContato != null}
          usuario={contatoUsuario}
          photoSize={120}
          showPhone
          authToken={authToken}
          loadPhotoFromUsersId
          onClose={() => setUsuarioContato(null)}
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
  loadingSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  toolbar: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
  searchInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: COLORS.navy,
    backgroundColor: COLORS.background,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GESTOR_USUARIOS_TABLE_COLUMN_GAP,
    paddingVertical: 10,
    paddingHorizontal: GESTOR_USUARIOS_TABLE_HORIZONTAL_PADDING / 2,
    backgroundColor: COLORS.highlight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  colNome: {
    flexShrink: 0,
    overflow: 'hidden',
  },
  colTelefone: {
    width: GESTOR_USUARIOS_TELEFONE_COLUMN_WIDTH,
    flexShrink: 0,
  },
  colEndereco: {
    flexShrink: 0,
    overflow: 'hidden',
  },
  colFlag: {
    width: GESTOR_USUARIOS_FLAG_COLUMN_WIDTH,
    flexShrink: 0,
    textAlign: 'center',
  },
  colActions: {
    width: GESTOR_USUARIOS_ACTIONS_COLUMN_WIDTH,
    flexShrink: 0,
    textAlign: 'center',
  },
  colUltimaEntrada: {
    width: GESTOR_USUARIOS_ULTIMA_ENTRADA_COLUMN_WIDTH,
    flexShrink: 0,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
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
});
