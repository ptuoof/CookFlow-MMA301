import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HeronColors, Radius, HeronShadow } from '../../constants/theme';
import { useRecipes } from '../../context/RecipeContext';
import { confirmAction } from '../../utils/dialog';

export const formatTimer = totalSeconds => {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mmss = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
};

/**
 * Countdown for one recipe step. The single app-wide timer lives in RecipeContext;
 * this component only shows it when it belongs to this step, so moving between steps
 * never resets or hijacks a timer that is still running for another step.
 */
export const TimerCircle = ({
  recipe,
  stepIndex,
  defaultSeconds
}) => {
  const { cookingTimer, timerSecondsLeft, startStepTimer, pauseTimer, resumeTimer, addTimerMinute, clearTimer } = useRecipes();
  const isOwn = !!cookingTimer && cookingTimer.recipeId === recipe?.id && cookingTimer.stepIndex === stepIndex;
  const status = isOwn ? cookingTimer.status : 'idle';
  const isRunning = status === 'running';
  const isCompleted = status === 'done';
  const secondsLeft = isOwn ? timerSecondsLeft : defaultSeconds;
  const otherActive = !isOwn && cookingTimer && cookingTimer.status !== 'done' ? cookingTimer : null;

  const start = () => startStepTimer({ recipe, stepIndex, seconds: defaultSeconds });
  const handleMain = () => {
    if (isRunning) return pauseTimer();
    if (status === 'paused') return resumeTimer();
    if (otherActive) {
      return confirmAction({
        title: 'Thay timer đang chạy?',
        message: `Timer "${otherActive.stepTitle}" (${otherActive.recipeTitle}) còn ${formatTimer(timerSecondsLeft)}. Bắt đầu timer bước này sẽ dừng timer kia.`,
        confirmText: 'Bắt đầu bước này',
        cancelText: 'Giữ timer cũ',
        onConfirm: start
      });
    }
    return start();
  };
  const handleReset = () => {
    if (isOwn) clearTimer();
  };

  return <View style={styles.container}>
      <View style={[styles.circleOuter, isCompleted ? styles.circleCompleted : isRunning ? styles.circleRunning : styles.circleIdle]}>
        <View style={styles.badgeState}>
          <Text style={[styles.badgeStateText, isRunning && styles.badgeStateActive]}>
            {isCompleted ? '✓ HOÀN TẤT' : isRunning ? '● ĐANG NẤU' : status === 'paused' ? 'TẠM DỪNG' : 'CHỜ KÍCH HOẠT'}
          </Text>
        </View>

        <Text style={[styles.timeText, isCompleted && styles.timeCompletedText]} accessibilityLiveRegion="polite">
          {formatTimer(secondsLeft)}
        </Text>

        <Text style={styles.subtext}>
          {isCompleted ? 'Đã kết thúc giai đoạn này' : isRunning ? 'Vẫn đếm khi bạn rời màn hình' : status === 'paused' ? 'Nhấn Tiếp tục để chạy tiếp' : 'Nhấn Bắt đầu khi sẵn sàng'}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable accessibilityRole="button" disabled={!isOwn} onPress={handleReset} style={({
        pressed
      }) => [styles.controlBtn, styles.btnOutline, !isOwn && styles.controlDisabled, {
        transform: [{
          scale: pressed ? 0.96 : 1
        }]
      }]}>
          <Text style={styles.btnOutlineText}>Đặt lại</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={isCompleted ? start : handleMain} style={({
        pressed
      }) => [styles.controlBtn, styles.mainBtn, isCompleted ? styles.mainBtnRestart : isRunning ? styles.mainBtnPause : styles.mainBtnStart, {
        transform: [{
          scale: pressed ? 0.96 : 1
        }]
      }]}>
          <Text style={styles.mainBtnText}>
            {isCompleted ? 'Lặp lại' : isRunning ? 'Tạm dừng' : status === 'paused' ? 'Tiếp tục' : 'Bắt đầu'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" disabled={!isOwn} onPress={addTimerMinute} style={({
        pressed
      }) => [styles.controlBtn, styles.btnOutline, !isOwn && styles.controlDisabled, {
        transform: [{
          scale: pressed ? 0.96 : 1
        }]
      }]}>
          <Text style={styles.btnOutlineText}>+1 Phút</Text>
        </Pressable>
      </View>

      {otherActive ? <Text style={styles.notice}>
          Đang có timer khác: "{otherActive.stepTitle}" • {formatTimer(timerSecondsLeft)}
        </Text> : null}
    </View>;
};
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 14
  },
  circleOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...HeronShadow.card
  },
  circleIdle: {
    borderColor: HeronColors.border
  },
  circleRunning: {
    borderColor: HeronColors.brand,
    backgroundColor: '#FFFAF8'
  },
  circleCompleted: {
    borderColor: HeronColors.emerald,
    backgroundColor: HeronColors.emeraldLight
  },
  badgeState: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 8
  },
  badgeStateText: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.granite,
    letterSpacing: 0.5
  },
  badgeStateActive: {
    color: HeronColors.brand
  },
  timeText: {
    fontSize: 46,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums']
  },
  timeCompletedText: {
    color: HeronColors.emerald
  },
  subtext: {
    fontSize: 11,
    fontWeight: '600',
    color: HeronColors.surface,
    marginTop: 6
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20
  },
  controlDisabled: {
    opacity: 0.4
  },
  notice: {
    marginTop: 12,
    maxWidth: 300,
    fontSize: 12,
    lineHeight: 17,
    color: HeronColors.granite,
    textAlign: 'center'
  },
  controlBtn: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: HeronColors.primary
  },
  mainBtn: {
    minWidth: 110,
    ...HeronShadow.brandGlow
  },
  mainBtnStart: {
    backgroundColor: HeronColors.brand
  },
  mainBtnPause: {
    backgroundColor: HeronColors.secondary
  },
  mainBtnRestart: {
    backgroundColor: HeronColors.emerald
  },
  mainBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  }
});
