import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HeronColors, Radius } from '../../constants/theme';
export const AppleBadge = ({
  label,
  variant = 'coral',
  icon,
  style
}) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'mint':
        return {
          bg: HeronColors.emeraldLight,
          border: '#C3E6CB',
          text: HeronColors.emerald
        };
      case 'honey':
        return {
          bg: HeronColors.amberLight,
          border: '#FFEAA7',
          text: HeronColors.amber
        };
      case 'sky':
        return {
          bg: HeronColors.blueLight,
          border: '#D0EBFF',
          text: HeronColors.blue
        };
      case 'muted':
        return {
          bg: HeronColors.cardAlt,
          border: HeronColors.border,
          text: HeronColors.granite
        };
      default:
        // Heron Brand Flame Orange
        return {
          bg: HeronColors.brandLight,
          border: '#FFD8CF',
          text: HeronColors.brand
        };
    }
  };
  const styleConfig = getBadgeStyle();
  return <View style={[styles.badge, {
    backgroundColor: styleConfig.bg,
    borderColor: styleConfig.border
  }, style]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, {
      color: styleConfig.text
    }]}>{label}</Text>
    </View>;
};
const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  icon: {
    fontSize: 11,
    marginRight: 4
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase'
  }
});