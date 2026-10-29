import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

type LogadoTableCellProps = {
  width: number;
  children: ReactNode;
  align?: 'center' | 'left';
  textStyle?: StyleProp<TextStyle>;
};

export function LogadoTableCell({
  width,
  children,
  align = 'center',
  textStyle,
}: LogadoTableCellProps) {
  const isText = typeof children === 'string' || typeof children === 'number';
  const isLeft = align === 'left';

  return (
    <View style={[styles.cell, { width }, isLeft && styles.cellLeft]}>
      {isText ? (
        <Text style={[styles.text, isLeft && styles.textLeft, textStyle]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLeft: {
    alignItems: 'flex-start',
  },
  text: {
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  textLeft: {
    textAlign: 'left',
  },
});
