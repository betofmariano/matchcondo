import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type HomeLocalContextBarProps = {
  localNome: string | null;
  canSwitchLocal: boolean;
  onPressSwitchLocal: () => void;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
  border: '#E2E6EE',
  muted: '#5C6475',
};

export function HomeLocalContextBar({
  localNome,
  canSwitchLocal,
  onPressSwitchLocal,
}: HomeLocalContextBarProps) {
  if (!localNome || !canSwitchLocal) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.localCard}>
        <Ionicons name="business-outline" size={20} color={COLORS.blue} />
        <View style={styles.localTextContainer}>
          <Text style={styles.localLabel}>Local atual</Text>
          <Text style={styles.localName}>{localNome}</Text>
        </View>
      </View>

      {canSwitchLocal ? (
        <Pressable style={styles.switchButton} onPress={onPressSwitchLocal}>
          <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.blue} />
          <Text style={styles.switchButtonText}>Trocar local</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 20,
    paddingHorizontal: 12,
    gap: 10,
  },
  localCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8FAFD',
  },
  localTextContainer: {
    flex: 1,
  },
  localLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 2,
  },
  localName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  switchButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  switchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.blue,
    textDecorationLine: 'underline',
  },
});
