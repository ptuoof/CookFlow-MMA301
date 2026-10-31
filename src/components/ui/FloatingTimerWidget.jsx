import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRecipes } from '../../context/RecipeContext';
import { HeronColors } from '../../constants/theme';
import { formatTimer } from './TimerCircle';

// Shown above the bottom dock while a step timer exists (running, paused or just finished),
// so a paused timer is never "lost" and a finished one can be acknowledged.
export const FloatingTimerWidget = ({ onPress, bottomOffset = 100 }) => {
  const { cookingTimer, timerSecondsLeft, clearTimer } = useRecipes();
  if (!cookingTimer) return null;
  const { status } = cookingTimer;
  const label = status === 'done' ? '✓ Hết giờ' : `${status === 'paused' ? '⏸' : '⏱'} ${formatTimer(timerSecondsLeft)}`;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
      <View style={[styles.pill, status === 'done' && styles.pillDone]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở lại bước nấu ${cookingTimer.stepTitle}, ${label}`}
          onPress={onPress}
          style={styles.main}
        >
          <Text style={styles.time}>{label}</Text>
          <Text style={styles.step} numberOfLines={1}>• {cookingTimer.stepTitle || cookingTimer.recipeTitle}</Text>
        </Pressable>
        {status !== 'running' ? <Pressable accessibilityRole="button" accessibilityLabel="Tắt timer" hitSlop={8} onPress={clearTimer} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { maxWidth: '92%', backgroundColor: HeronColors.primary, borderRadius: 28, flexDirection: 'row', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pillDone: { backgroundColor: HeronColors.emerald },
  main: { minHeight: 44, paddingLeft: 18, paddingRight: 14, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 1 },
  time: { color: '#FFFFFF', fontWeight: '800', fontVariant: ['tabular-nums'] },
  step: { color: '#FFFFFF', maxWidth: 180, flexShrink: 1 },
  close: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.25)' },
  closeText: { color: '#FFFFFF', fontWeight: '800' }
});
