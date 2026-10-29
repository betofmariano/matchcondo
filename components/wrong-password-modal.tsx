import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';

type WrongPasswordModalProps = {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
  white: '#FFFFFF',
};

export function WrongPasswordModal({
  visible,
  title,
  message,
  primaryLabel = 'Esqueci minha senha',
  secondaryLabel = 'Tentar novamente',
  onPrimary,
  onSecondary,
}: WrongPasswordModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= WEB_MAX_CONTENT_WIDTH;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary}>
      <View style={styles.overlay}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={onPrimary}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}>
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onSecondary}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
  },
  cardWide: {
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: COLORS.navy,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.blue,
  },
});
