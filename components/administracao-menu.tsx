import { useMemo, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CriarMapaDiarioPanel } from '@/components/criar-mapa-diario-panel';
import { MenuActionButton } from '@/components/menu-action-button';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import { useUserContext } from '@/contexts/user-context';
import type { AdministracaoMenuAccess } from '@/hooks/use-administracao-menu-access';
import type { User } from '@/types/user';
import { isUserAdministrador } from '@/utils/club-config';
import { isGestorMenuRouteEnabled } from '@/utils/academia-permissoes-gestor';
import { getAdministracaoMenuButtonWidth } from '@/utils/administracao-menu-layout';
import { getHomeMenuButtonMetrics } from '@/utils/home-menu-button';

type AdministracaoMenuProps = {
  user: User;
  access: AdministracaoMenuAccess;
};

type AdminMenuItem = {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const BUTTON_GAP = 18;

const ADMIN_ONLY_ITEMS: AdminMenuItem[] = [
  { label: 'Lista de Acessos', route: '/lista-acessos', icon: 'enter-outline' },
  { label: 'Lista de Logins', route: '/lista-logins', icon: 'key-outline' },
  { label: 'Lista de Logados', route: '/lista-logados', icon: 'people-circle-outline' },
];

const CLUB_ADMIN_ITEMS: AdminMenuItem[] = [
  { label: 'Lista de Usuários', route: '/lista-usuarios-gestor', icon: 'people-outline' },
  { label: 'Lista de Reservas', route: '/lista-reservas', icon: 'calendar-outline' },
  { label: 'Configuração do Local', route: '/configuracao-local', icon: 'business-outline' },
  { label: 'Cadastro de Atividades', route: '/cadastro-atividades', icon: 'tennisball-outline' },
  { label: 'Cadastro de Horários', route: '/cadastro-horarios', icon: 'time-outline' },
];

export function AdministracaoMenu({ user, access }: AdministracaoMenuProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { currentAcademia } = useUserContext();
  const { isClubGestor } = access;
  const isAdministrador = isUserAdministrador(user);
  const menuButtonMetrics = getHomeMenuButtonMetrics(width);
  const menuButtonWidth = getAdministracaoMenuButtonWidth(width);
  const [showCriarMapaDiarioPanel, setShowCriarMapaDiarioPanel] = useState(false);

  const gestaoItems = useMemo(
    () =>
      CLUB_ADMIN_ITEMS.filter((item) => {
        if (item.route === '/configuracao-local') {
          return isAdministrador;
        }

        if (isAdministrador) {
          return true;
        }

        return isGestorMenuRouteEnabled(item.route, currentAcademia);
      }),
    [currentAcademia, isAdministrador],
  );

  function renderMenuButton(
    item: AdminMenuItem,
    options?: { isFirst?: boolean; onPress?: () => void },
  ) {
    return (
      <MenuActionButton
        label={item.label}
        backgroundColor={MATCHPOINT_COLORS.blue}
        textColor={MATCHPOINT_COLORS.white}
        width={menuButtonWidth}
        fontSize={menuButtonMetrics.fontSize}
        buttonHeight={menuButtonMetrics.buttonHeight}
        iconContainerWidth={menuButtonMetrics.iconContainerWidth}
        paddingHorizontal={menuButtonMetrics.paddingHorizontal}
        icon={
          <Ionicons
            name={item.icon}
            size={menuButtonMetrics.iconSize}
            color={MATCHPOINT_COLORS.white}
          />
        }
        style={options?.isFirst ? undefined : { marginTop: BUTTON_GAP }}
        onPress={options?.onPress ?? (() => handleNavigate(item.route))}
      />
    );
  }

  function handleNavigate(route: string) {
    router.push(route as never);
  }

  function renderMenuColumn(items: AdminMenuItem[]) {
    return (
      <View style={[styles.menuColumn, { width: menuButtonWidth }]}>
        {items.map((item, index) => (
          <View key={item.route} style={styles.menuButtonSlot}>
            {renderMenuButton(item, { isFirst: index === 0 })}
          </View>
        ))}
      </View>
    );
  }

  function renderGestaoSection() {
    if (gestaoItems.length === 0) {
      return null;
    }

    return (
      <View style={[styles.section, { maxWidth: menuButtonWidth }]}>
        <Text style={styles.sectionTitle}>Gestão</Text>
        {renderMenuColumn(gestaoItems)}
      </View>
    );
  }

  const hasAdminItems = isAdministrador;
  const hasClubItems = isAdministrador || isClubGestor;

  if (!hasAdminItems && !hasClubItems) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Nenhuma opção de administração disponível.</Text>
      </View>
    );
  }

  return (
    <View style={styles.menuContainer}>
      {hasAdminItems ? (
        <View style={[styles.section, { maxWidth: menuButtonWidth }]}>
          <Text style={styles.sectionTitle}>Sistema</Text>
          {ADMIN_ONLY_ITEMS.map((item, index) => (
            <View key={item.route} style={styles.menuButtonSlot}>
              {renderMenuButton(item, { isFirst: index === 0 })}
            </View>
          ))}
          {!showCriarMapaDiarioPanel ? (
            <View style={styles.menuButtonSlot}>
              {renderMenuButton(
                { label: 'Criar Mapa Diario', route: 'criar-mapa-diario', icon: 'calendar-outline' },
                { onPress: () => setShowCriarMapaDiarioPanel(true) },
              )}
            </View>
          ) : (
            <View style={[styles.criarMapaSlot, { width: menuButtonWidth }]}>
              <CriarMapaDiarioPanel user={user} enabled={showCriarMapaDiarioPanel} />
            </View>
          )}
        </View>
      ) : null}

      {hasClubItems ? renderGestaoSection() : null}
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
  },
  section: {
    width: '100%',
    alignItems: 'center',
  },
  menuColumn: {
    alignItems: 'center',
  },
  menuButtonSlot: {
    width: '100%',
    alignItems: 'center',
  },
  criarMapaSlot: {
    marginTop: BUTTON_GAP,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
    marginBottom: BUTTON_GAP,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: MATCHPOINT_COLORS.muted,
    textAlign: 'center',
  },
});
