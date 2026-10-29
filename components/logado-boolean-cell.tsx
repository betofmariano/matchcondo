import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type LogadoBooleanCellProps = {
  value: boolean;
  iconSize?: number;
};

const DEFAULT_ICON_SIZE = 18;
const DEFAULT_DOT_SIZE = 10;
const DEFAULT_CONTAINER_WIDTH = 42;

const COLORS = {
  blue: '#0F7A6C',
  muted: '#C5CAD6',
};

export function LogadoBooleanCell({ value, iconSize = DEFAULT_ICON_SIZE }: LogadoBooleanCellProps) {
  const scale = iconSize / DEFAULT_ICON_SIZE;
  const dotSize = DEFAULT_DOT_SIZE * scale;
  const containerWidth = DEFAULT_CONTAINER_WIDTH * scale;

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {value ? (
        <Ionicons name="checkmark-circle" size={iconSize} color={COLORS.blue} />
      ) : (
        <View
          style={[
            styles.emptyDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDot: {
    backgroundColor: COLORS.muted,
    opacity: 0.35,
  },
});
