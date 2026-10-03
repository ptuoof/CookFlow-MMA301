import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { HeronColors, Radius, HeronShadow } from '../../constants/theme';

interface AppleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'mint' | 'danger' | 'ghost' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  textStyle,
  disabled = false,
}) => {
  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) return '#EDEDE8';
    switch (variant) {
      case 'primary':
        return pressed ? HeronColors.brandHover : HeronColors.brand;
      case 'secondary':
        return pressed ? '#E2E2DC' : HeronColors.cardAlt;
      case 'outline':
        return pressed ? HeronColors.borderLight : '#FFFFFF';
      case 'mint':
        return pressed ? '#237032' : HeronColors.emerald;
      case 'danger':
        return pressed ? '#B02500' : HeronColors.brand;
      case 'ghost':
        return pressed ? 'rgba(40,40,40,0.06)' : 'transparent';
      case 'glass':
        return pressed ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)';
      default:
        return HeronColors.brand;
    }
  };

  const getTextColor = () => {
    if (disabled) return HeronColors.disable;
    switch (variant) {
      case 'primary':
      case 'mint':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost':
      case 'glass':
        return HeronColors.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 38;
      case 'lg':
        return 52;
      default:
        return 46;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(pressed),
          height: getHeight(),
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: disabled ? 0.6 : 1,
        },
        variant === 'outline' && styles.outlineBorder,
        variant === 'primary' ? HeronShadow.brandGlow : HeronShadow.subtle,
        style,
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text
        style={[
          styles.text,
          {
            color: getTextColor(),
            fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
            fontWeight: size === 'lg' ? '800' : '700',
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: Radius.full,
  },
  outlineBorder: {
    borderWidth: 1,
    borderColor: HeronColors.border,
  },
  icon: {
    marginRight: 8,
    fontSize: 16,
  },
  text: {
    letterSpacing: -0.2,
  },
});
