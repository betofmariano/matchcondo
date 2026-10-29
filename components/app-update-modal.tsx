import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { APP_DISPLAY_NAME } from '@/constants/app-branding';
import { APP_VERSION } from '@/constants/app-version';
import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';
import type { RemoteVersion } from '@/types/version';

type AppUpdateModalProps = {
  visible: boolean;
  remoteVersion: RemoteVersion | null;
  isUpdating?: boolean;
  updateErrorMessage?: string | null;
  onUpdate: () => void;
  onDismiss?: () => void;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
  white: '#FFFFFF',
  muted: '#5C6475',
};

export function AppUpdateModal({
  visible,
  remoteVersion,
  isUpdating = false,
  updateErrorMessage = null,
  onUpdate,
  onDismiss,
}: AppUpdateModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= WEB_MAX_CONTENT_WIDTH;
  const mandatory = remoteVersion?.mandatory === true;
  const message = remoteVersion?.message?.trim();

  function handleRequestClose() {
    if (mandatory || isUpdating) {
      return;
    }

    onDismiss?.();
  }

  if (!remoteVersion) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <Text style={styles.title}>Nova versão disponível</Text>

          <Text style={styles.message}>Existe uma nova versão do {APP_DISPLAY_NAME} disponível.</Text>

          <Text style={styles.versionLine}>
            Versão atual:{'\n'}
            {APP_VERSION}
          </Text>

          <Text style={styles.versionLine}>
            Nova versão:{'\n'}
            {remoteVersion.version}
          </Text>

          {message ? <Text style={styles.customMessage}>{message}</Text> : null}

          {updateErrorMessage ? (
            <Text style={styles.errorMessage}>{updateErrorMessage}</Text>
          ) : null}

          <View style={styles.actions}>
            {!mandatory ? (
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={onDismiss}
                disabled={isUpdating}>
                <Text style={styles.secondaryButtonText}>Lembrar depois</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.button,
                styles.primaryButton,
                mandatory && styles.buttonFullWidth,
                isUpdating && styles.buttonDisabled,
              ]}
              onPress={onUpdate}
              disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Atualizar agora</Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
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
    marginBottom: 16,
  },
  versionLine: {
    fontSize: 14,
    color: COLORS.navy,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  customMessage: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#D64545',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.blue,
  },
  secondaryButton: {
    backgroundColor: '#EEF1F6',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonFullWidth: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
});
