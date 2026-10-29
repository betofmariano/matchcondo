import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { APP_DISPLAY_NAME } from '@/constants/app-branding';
import {
  INSTALAR_APP_LOGIN_ADVANTAGE,
  INSTALAR_APP_LOGIN_DISMISS_LABEL,
  INSTALAR_APP_LOGIN_HOW_TO,
  INSTALAR_APP_LOGIN_SEE_GUIDE_LABEL,
  INSTALAR_APP_LOGIN_TITLE,
} from '@/constants/instalar-app-login';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';

type InstalarAppLoginModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onSeeGuide: () => void;
};

export function InstalarAppLoginModal({
  visible,
  onDismiss,
  onSeeGuide,
}: InstalarAppLoginModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= WEB_MAX_CONTENT_WIDTH;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.iconCircle}>
            <Ionicons name="phone-portrait-outline" size={28} color={MATCHPOINT_COLORS.blue} />
          </View>

          <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
          <Text style={styles.title}>{INSTALAR_APP_LOGIN_TITLE}</Text>
          <Text style={styles.message}>{INSTALAR_APP_LOGIN_ADVANTAGE}</Text>
          <Text style={styles.message}>{INSTALAR_APP_LOGIN_HOW_TO}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.guideButton]}
              onPress={onSeeGuide}
              accessibilityRole="button"
              accessibilityLabel={INSTALAR_APP_LOGIN_SEE_GUIDE_LABEL}>
              <Text style={styles.guideButtonText}>{INSTALAR_APP_LOGIN_SEE_GUIDE_LABEL}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.dismissButton]}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={INSTALAR_APP_LOGIN_DISMISS_LABEL}>
              <Text style={styles.dismissButtonText}>{INSTALAR_APP_LOGIN_DISMISS_LABEL}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: MATCHPOINT_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: MATCHPOINT_COLORS.white,
    borderRadius: 14,
    padding: 20,
  },
  cardWide: {
    alignSelf: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF3FB',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.blue,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dismissButton: {
    backgroundColor: '#EEF1F6',
  },
  guideButton: {
    backgroundColor: MATCHPOINT_COLORS.blue,
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
  },
  guideButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.white,
    textAlign: 'center',
  },
});
