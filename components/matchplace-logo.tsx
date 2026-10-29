import {
  Image,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { APP_DISPLAY_NAME } from '@/constants/app-branding';
import { MATCHPOINT_COLORS } from '@/constants/theme';

type AppLogoProps = {
  size?: 'default' | 'large';
  style?: StyleProp<ImageStyle>;
};

type AppLogoHomeLinkProps = {
  onPress: () => void;
  size?: 'default' | 'large';
  logoStyle?: StyleProp<ImageStyle>;
  style?: StyleProp<ViewStyle>;
  showTapHint?: boolean;
};

export const APP_LOGO_TAP_HINT = 'Toque no logo para ir ao início';
/** @deprecated Use APP_LOGO_TAP_HINT */
export const MATCHPLACE_LOGO_TAP_HINT = APP_LOGO_TAP_HINT;

const LOGO_ICON_SOURCE = require('@/assets/images/logo-reservasdomorador-icon.png');
const LOGO_WORDMARK_COLOR = '#352359';
const SIZE_WIDTHS = {
  default: 96,
  large: 176,
} as const;

function readStyleWidth(style: StyleProp<ImageStyle> | undefined, fallback: number): number {
  const flattened = StyleSheet.flatten(style);
  const width = flattened && typeof flattened === 'object' ? flattened.width : undefined;
  return typeof width === 'number' ? width : fallback;
}

function omitSize(style: ImageStyle | undefined): ImageStyle | undefined {
  if (!style) {
    return undefined;
  }

  const { width: _width, height: _height, ...rest } = style;
  return rest;
}

export function AppLogo({ size = 'default', style }: AppLogoProps) {
  const width = readStyleWidth(style, SIZE_WIDTHS[size]);
  const fontSize = Math.max(10, Math.round(width / 6.4));
  const extraStyle = omitSize(StyleSheet.flatten(style));

  return (
    <View
      style={[styles.mark, extraStyle, { width }]}
      accessibilityRole="image"
      accessibilityLabel={APP_DISPLAY_NAME}>
      <Image
        source={LOGO_ICON_SOURCE}
        style={[styles.icon, { width, height: width }]}
        resizeMode="contain"
      />
      <Text
        style={[
          styles.wordmark,
          {
            width,
            fontSize,
            lineHeight: Math.round(fontSize * 1.22),
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.15}>
        {APP_DISPLAY_NAME}
      </Text>
    </View>
  );
}

/** @deprecated Use AppLogo */
export const MatchPlaceLogo = AppLogo;

export function AppLogoHomeLink({
  onPress,
  size = 'default',
  logoStyle,
  style,
  showTapHint = true,
}: AppLogoHomeLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Voltar para Home"
      style={style}>
      <View style={styles.homeLinkContent}>
        <AppLogo size={size} style={logoStyle} />
        {showTapHint ? <Text style={styles.tapHint}>{APP_LOGO_TAP_HINT}</Text> : null}
      </View>
    </Pressable>
  );
}

/** @deprecated Use AppLogoHomeLink */
export const MatchPlaceLogoHomeLink = AppLogoHomeLink;

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  icon: {
    backgroundColor: 'transparent',
  },
  wordmark: {
    marginTop: 4,
    color: LOGO_WORDMARK_COLOR,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  homeLinkContent: {
    alignItems: 'center',
  },
  tapHint: {
    marginTop: 4,
    maxWidth: 140,
    fontSize: 11,
    lineHeight: 14,
    color: MATCHPOINT_COLORS.muted,
    textAlign: 'center',
  },
});
