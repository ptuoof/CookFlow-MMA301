import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRecipes } from '../../context/RecipeContext';
import { HeronColors } from '../../constants/theme';

export const FloatingTimerWidget = ({ onPress }) => {
  const { cookingTimer } = useRecipes();
  if (!cookingTimer?.running) return null;

  const minutes = Math.floor(cookingTimer.secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (cookingTimer.secondsLeft % 60).toString().padStart(2, '0');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Mở lại timer ${minutes}:${seconds}`} onPress={onPress} style={styles.pill}>
      <Text style={styles.time}>⏱ {minutes}:{seconds}</Text>
      <Text style={styles.step} numberOfLines={1}>• {cookingTimer.stepTitle || cookingTimer.recipeTitle}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: { position: 'absolute', bottom: 24, alignSelf: 'center', maxWidth: '92%', backgroundColor: HeronColors.primary, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center', elevation: 8 },
  time: { color: '#FFFFFF', fontWeight: '800', fontVariant: ['tabular-nums'] },
  step: { color: '#FFFFFF', maxWidth: 180 },
});
