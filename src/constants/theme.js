import { Platform } from 'react-native';

/**
 * Heron AI Design System
 * Inspired by Heron AI (Bearplus) - Minimalist, Architectural, Product-Led
 * Base: Deep Charcoal, Architectural Off-White Canvas, Precision Hairline Borders, Flame Orange Accent
 */

export const HeronColors = {
  // Brand Flame Orange (Signature Heron AI Accent)
  brand: '#FA3600',
  brandHover: '#D72201',
  brandLight: '#FFF0EC',
  brandMuted: '#FA360015',
  accentFlame: '#FA3600',
  // Deep Charcoal & Architectural Neutrals
  primary: '#282828',
  // Deep Charcoal (Thay thế đen gắt)
  inkPrimary: '#282828',
  secondary: '#414140',
  // Slate Charcoal
  granite: '#626260',
  surface: '#72726F',
  disable: '#B4B4B0',
  border: '#E2E2DC',
  // Hairline architectural border
  borderLight: '#EDEDE8',
  // Canvas & Surfaces
  canvas: '#F6F6F4',
  // Heron Off-White Canvas sạch sẽ
  card: '#FFFFFF',
  cardAlt: '#F9F9F7',
  // Secondary Accents
  emerald: '#2B8A3E',
  emeraldLight: '#EBFBEE',
  amber: '#D97706',
  amberLight: '#FFF9DB',
  blue: '#1971C2',
  blueLight: '#E7F5FF'
};

// Aliases for compatibility
export const AppleColors = {
  coral: HeronColors.brand,
  coralLight: HeronColors.brandLight,
  coralDark: HeronColors.brandHover,
  peach: HeronColors.amber,
  peachLight: HeronColors.amberLight,
  mint: '#2B8A3E',
  mintLight: '#EBFBEE',
  mintDark: '#2B8A3E',
  honey: HeronColors.amber,
  honeyLight: HeronColors.amberLight,
  lavender: '#7048E8',
  lavenderLight: '#F3F0FF',
  lavenderDark: '#5F3DC4',
  sky: HeronColors.blue,
  skyLight: HeronColors.blueLight,
  background: HeronColors.canvas,
  card: HeronColors.card,
  cardMuted: HeronColors.cardAlt,
  cardBorder: HeronColors.border,
  textPrimary: HeronColors.primary,
  textSecondary: HeronColors.granite,
  textMuted: HeronColors.disable,
  success: HeronColors.emerald,
  warning: HeronColors.amber,
  danger: HeronColors.brand
};
export const Colors = {
  light: {
    text: HeronColors.primary,
    background: HeronColors.canvas,
    backgroundElement: HeronColors.cardAlt,
    backgroundSelected: HeronColors.brandLight,
    textSecondary: HeronColors.granite
  },
  dark: {
    text: '#FFFFFF',
    background: '#181918',
    backgroundElement: '#222322',
    backgroundSelected: '#2F2E2B',
    textSecondary: '#A0A09B'
  }
};
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace'
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace'
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)'
  }
});
export const HeronShadow = {
  soft: {
    shadowColor: '#282828',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  subtle: {
    shadowColor: '#282828',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  card: {
    shadowColor: '#282828',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4
  },
  dock: {
    shadowColor: '#282828',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8
  },
  brandGlow: {
    shadowColor: '#FA3600',
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6
  }
};
export const AppleShadow = HeronShadow;
export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999
};
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36
};
export const BottomTabInset = Platform.select({
  ios: 50,
  android: 80
}) ?? 0;
export const MaxContentWidth = 800;