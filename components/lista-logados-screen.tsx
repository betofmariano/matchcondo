import { useCallback, useEffect, useState } from 'react';
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
import { LogadoClubeFilter } from '@/components/logado-clube-filter';
import { LogadoGestorFilter } from '@/components/logado-gestor-filter';
import { LogadoDetalhesModal } from '@/components/logado-detalhes-modal';
import { LogadoListItem } from '@/components/logado-list-item';
import { LogadoTableCell } from '@/components/logado-table-cell';
import { ScreenHeader, ScreenHeaderDivider } from '@/components/screen-header';
import { WebScreenContainer } from '@/components/web-screen-container';
import { LOGADOS_SCREEN_MAX_WIDTH, LOGADOS_TABLE_MIN_WIDTH } from '@/constants/web-layout';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import {
  LISTA_LOGADOS_MESSAGES,
  useListaLogadosScreen,
} from '@/hooks/use-lista-logados-screen';
import type { LogadoRecord } from '@/types/logado';
import {
  LOGADOS_COL_WIDTHS,
  LOGADOS_TABLE_GAP,
  LOGADOS_TABLE_ROW_MIN_HEIGHT,
  LOGADOS_TABLE_ROW_PADDING_H,
  LOGADOS_TABLE_ROW_PADDING_V,
} from '@/utils/logado-table-layout';

const COLORS = {
  background: '#FFFFFF',
  navy: '#3A2154',
  blue: '#0F7A6C',
  error: '#D64545',
  muted: '#5C6475',
  border: '#D5DAE3',
  highlight: '#FFF4D6',
};

const TABLE_MIN_WIDTH = LOGADOS_TABLE_MIN_WIDTH;

export function ListaLogadosScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { user, authToken, isLoading: isAuthLoading, signOut } = useAuth();

  const [logadoSelecionado, setLogadoSelecionado] = useState<LogadoRecord | null>(null);
  const [isDetalheVisible, setIsDetalheVisible] = useState(false);

  const isAdministrador = user?.administrador === true;

  const handleUnauthorized = useCallback(async () => {
    await signOut();
    router.replace('/login');
  }, [router, signOut]);

  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }

    if (!isAdministrador) {
      router.replace('/');
    }
  }, [isAdministrador, isAuthLoading, router, user]);

  const {
    logados,
    clubOptions,
    isLoading,
    isRefreshing,
    loadError,
    searchQuery,
    selectedClubId,
    gestorFilter,
    sortField,
    sortDirection,
    isDeleting,
    setSearchQuery,
    setSelectedClubId,
    setGestorFilter,
    fetchLogados,
    handleSortFieldChange,
    deleteLogadoRecord,
  } = useListaLogadosScreen({
    isAdministrador,
    authToken,
    isAuthLoading,
    onUnauthorized: handleUnauthorized,
  });

  function handleLogadoPress(logado: LogadoRecord) {
    console.log('Registro selecionado:', Boolean(logado?.id));
    setLogadoSelecionado(logado);
    setIsDetalheVisible(true);
  }

  async function handleDeletePress(logado: LogadoRecord) {
    if (isDeleting) {
      return;
    }

    const error = await deleteLogadoRecord(logado.id);

    if (error) {
      showToast(error, { variant: 'error' });
    }
  }

  function handleCloseDetalhe() {
    setIsDetalheVisible(false);
    setLogadoSelecionado(null);
  }

  if (isAuthLoading || !user || !isAdministrador) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
        <WebScreenContainer maxWidth={LOGADOS_SCREEN_MAX_WIDTH}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        </WebScreenContainer>
      </SafeAreaView>
    );
  }

  const showList = !isLoading && !loadError && logados.length > 0;

  const tableHeader = (
    <View style={styles.tableHeader}>
      <View style={styles.deleteHeaderSpacer} />
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.data} textStyle={styles.tableHeaderText}>
        Data
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.id} textStyle={styles.tableHeaderText}>
        ID
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.nome} align="left" textStyle={styles.tableHeaderText}>
        Nome do Usuário
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag} textStyle={styles.tableHeaderText}>
        aprov
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag} textStyle={styles.tableHeaderText}>
        gest
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag} textStyle={styles.tableHeaderText}>
        adm
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag} textStyle={styles.tableHeaderText}>
        bloq
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag} textStyle={styles.tableHeaderText}>
        xano
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag} textStyle={styles.tableHeaderText}>
        bub
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.width} textStyle={styles.tableHeaderText}>
        width
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.clube} align="left" textStyle={styles.tableHeaderText}>
        Local
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.telefone} textStyle={styles.tableHeaderText}>
        Telefone
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.plataforma} textStyle={styles.tableHeaderText}>
        Plataforma
      </LogadoTableCell>
      <LogadoTableCell width={LOGADOS_COL_WIDTHS.dispositivo} align="left" textStyle={styles.tableHeaderText}>
        Dispositivo
      </LogadoTableCell>
    </View>
  );

  function renderListItem({ item }: { item: LogadoRecord }) {
    return (
      <LogadoListItem
        logado={item}
        layout="table"
        onPress={() => handleLogadoPress(item)}
        onDeletePress={() => void handleDeletePress(item)}
      />
    );
  }

  const listElement = (
    <FlatList
      style={styles.list}
      data={showList ? logados : []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={showList ? tableHeader : null}
      renderItem={renderListItem}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void fetchLogados({ refreshing: true })}
          tintColor={COLORS.blue}
          colors={[COLORS.blue]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <WebScreenContainer maxWidth={LOGADOS_SCREEN_MAX_WIDTH} style={styles.screenContainer}>
        <ScreenHeader user={user} title={'Lista de\nLogados'} />
        <ScreenHeaderDivider />

        <View style={styles.toolbar}>
          <Text style={styles.countText}>Quantidade de Usuários : {logados.length}</Text>

          <LogadoClubeFilter
            clubs={clubOptions}
            selectedClubId={selectedClubId}
            onChange={setSelectedClubId}
            disabled={isLoading && !isRefreshing}
          />

          <LogadoGestorFilter
            value={gestorFilter}
            onChange={setGestorFilter}
            disabled={isLoading && !isRefreshing}
          />

          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filtrar"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.sortRow}>
            <Pressable
              style={[styles.sortButton, sortField === 'data' && styles.sortButtonActive]}
              onPress={() => handleSortFieldChange('data')}>
              <Text
                style={[styles.sortButtonText, sortField === 'data' && styles.sortButtonTextActive]}>
                Data{sortField === 'data' ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.sortButton, sortField === 'nome' && styles.sortButtonActive]}
              onPress={() => handleSortFieldChange('nome')}>
              <Text
                style={[styles.sortButtonText, sortField === 'nome' && styles.sortButtonTextActive]}>
                Nome{sortField === 'nome' ? (sortDirection === 'desc' ? ' ↓' : ' ↑') : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        {isLoading && !isRefreshing ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryButton} onPress={() => void fetchLogados()}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !loadError && logados.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>{LISTA_LOGADOS_MESSAGES.empty}</Text>
          </View>
        ) : null}

        {showList ? (
          <AdminTableScrollContainer minWidth={TABLE_MIN_WIDTH} maxWidth={LOGADOS_SCREEN_MAX_WIDTH}>
            {listElement}
          </AdminTableScrollContainer>
        ) : null}

        <LogadoDetalhesModal
          visible={isDetalheVisible}
          logado={logadoSelecionado}
          onClose={handleCloseDetalhe}
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
  list: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
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
  sortRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  sortButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  sortButtonActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LOGADOS_TABLE_GAP,
    minHeight: LOGADOS_TABLE_ROW_MIN_HEIGHT,
    paddingVertical: LOGADOS_TABLE_ROW_PADDING_V,
    paddingHorizontal: LOGADOS_TABLE_ROW_PADDING_H,
    backgroundColor: COLORS.highlight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minWidth: TABLE_MIN_WIDTH,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  deleteHeaderSpacer: {
    width: LOGADOS_COL_WIDTHS.delete,
    flexShrink: 0,
  },
  centerContent: {
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
