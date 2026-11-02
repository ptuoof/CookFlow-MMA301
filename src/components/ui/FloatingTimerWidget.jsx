import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRecipes } from '../../context/RecipeContext';
import { HeronColors } from '../../constants/theme';
import { formatTimer } from './TimerCircle';
import { sortTimers } from '../../utils/timers';

// Shown above the bottom dock while step timers exist (running, paused or just finished),
// so a paused timer is never "lost" and a finished one can be acknowledged. With several timers
// it shows the one that needs attention first (soonest to finish) and how many others there are.
export const FloatingTimerWidget = ({ onPress, bottomOffset = 100 }) => {
  const { timers, clearTimer } = useRecipes();
  if (!timers.length) return null;
  const [timer, ...others] = sortTimers(timers);
  const { status } = timer;
  const label = status === 'done' ? '✓ Hết giờ' : `${status === 'paused' ? '⏸' : '⏱'} ${formatTimer(timer.secondsLeft)}`;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }]}>
      <View style={[styles.pill, status === 'done' && styles.pillDone]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở lại bước nấu ${timer.stepTitle}, ${label}${others.length ? `, còn ${others.length} timer khác` : ''}`}
          onPress={() => onPress(timer)}
          style={styles.main}
        >
          <Text style={styles.time}>{label}</Text>
          <Text style={styles.step} numberOfLines={1}>• {timer.stepTitle || timer.recipeTitle}</Text>
          {others.length ? <View style={styles.more}><Text style={styles.moreText}>+{others.length}</Text></View> : null}
        </Pressable>
        {status !== 'running' ? <Pressable accessibilityRole="button" accessibilityLabel="Tắt timer" hitSlop={8} onPress={() => clearTimer(timer.id)} style={styles.close}>
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
  step: { color: '#FFFFFF', maxWidth: 160, flexShrink: 1 },
  more: { minWidth: 26, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  close: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.25)' },
  closeText: { color: '#FFFFFF', fontWeight: '800' }
});
