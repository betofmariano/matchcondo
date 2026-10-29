import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastVariant = 'success' | 'error' | 'info';

type ToastAction = {
  label: string;
  onPress: () => void;
};

type ToastPlacement = 'bottom' | 'center';

type ToastOptions = {
  duration?: number;
  variant?: ToastVariant;
  action?: ToastAction;
  placement?: ToastPlacement;
};

type ToastState = {
  message: string;
  duration: number;
  variant: ToastVariant;
  action?: ToastAction;
  placement: ToastPlacement;
};

type AppToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 3_500;

const TOAST_COLORS: Record<ToastVariant, string> = {
  success: '#2E9E5A',
  error: '#D64545',
  info: '#0F7A6C',
};

function AppToastOverlay({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isCenter = toast.placement === 'center';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, isCenter ? styles.overlayCenter : styles.overlayBottom]}>
      <View
        pointerEvents={toast.action ? 'auto' : 'none'}
        style={[
          styles.toast,
          isCenter ? styles.toastCenter : styles.toastBottom,
          {
            backgroundColor: TOAST_COLORS[toast.variant],
            marginBottom: isCenter ? 0 : Math.max(insets.bottom, 16),
          },
        ]}>
        <Text style={styles.message}>{toast.message}</Text>

        {toast.action ? (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              onDismiss();
            }}
            hitSlop={8}>
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      hideToast();

      const nextToast: ToastState = {
        message,
        duration: options?.duration ?? DEFAULT_DURATION_MS,
        variant: options?.variant ?? 'error',
        action: options?.action,
        placement: options?.placement ?? 'bottom',
      };

      setToast(nextToast);

      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, nextToast.duration);
    },
    [hideToast],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      hideToast,
    }),
    [hideToast, showToast],
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}
      {toast ? <AppToastOverlay toast={toast} onDismiss={hideToast} /> : null}
    </AppToastContext.Provider>
  );
}

export function useAppToast(): AppToastContextValue {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error('useAppToast deve ser usado dentro de AppToastProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
    elevation: 999,
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    justifyContent: 'center',
  },
  toast: {
    maxWidth: 420,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastBottom: {
    width: '100%',
  },
  toastCenter: {
    paddingHorizontal: 22,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
