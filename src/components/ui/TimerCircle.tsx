import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HeronColors, Radius, HeronShadow } from '../../constants/theme';

interface TimerCircleProps {
  initialSeconds: number;
  onFinish?: () => void;
  autoStart?: boolean;
}

export const TimerCircle: React.FC<TimerCircleProps> = ({
  initialSeconds,
  onFinish,
  autoStart = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setIsCompleted(false);
    setIsRunning(autoStart);
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      setIsCompleted(true);
      if (onFinish) onFinish();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, secondsLeft]);

  const toggleRunning = () => {
    if (isCompleted) {
      setSecondsLeft(initialSeconds);
      setIsCompleted(false);
      setIsRunning(true);
      return;
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSecondsLeft(initialSeconds);
    setIsRunning(false);
    setIsCompleted(false);
  };

  const addOneMinute = () => {
    setSecondsLeft((prev) => prev + 60);
    setIsCompleted(false);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Vòng Timer tối giản phong cách Heron AI */}
      <View
        style={[
          styles.circleOuter,
          isCompleted
            ? styles.circleCompleted
            : isRunning
            ? styles.circleRunning
            : styles.circleIdle,
        ]}
      >
        <View style={styles.badgeState}>
          <Text style={[styles.badgeStateText, isRunning && styles.badgeStateActive]}>
            {isCompleted ? '✓ HOÀN TẤT' : isRunning ? '● ĐANG NẤU' : 'CHỜ KÍCH HOẠT'}
          </Text>
        </View>

        <Text style={[styles.timeText, isCompleted && styles.timeCompletedText]}>
          {formatTime(secondsLeft)}
        </Text>

        <Text style={styles.subtext}>
          {isCompleted
            ? 'Đã kết thúc giai đoạn này'
            : isRunning
            ? 'Đang đếm ngược chính xác'
            : 'Nhấn Bắt đầu khi sẵn sàng'}
        </Text>
      </View>

      {/* Điều khiển dạng Pill kiểu Heron AI */}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={resetTimer}
          style={({ pressed }) => [
            styles.controlBtn,
            styles.btnOutline,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Text style={styles.btnOutlineText}>Đặt lại</Text>
        </Pressable>

        <Pressable
          onPress={toggleRunning}
          style={({ pressed }) => [
            styles.controlBtn,
            styles.mainBtn,
            isCompleted
              ? styles.mainBtnRestart
              : isRunning
              ? styles.mainBtnPause
              : styles.mainBtnStart,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Text style={styles.mainBtnText}>
            {isCompleted ? 'Lặp lại' : isRunning ? 'Tạm dừng' : 'Bắt đầu'}
          </Text>
        </Pressable>

        <Pressable
          onPress={addOneMinute}
          style={({ pressed }) => [
            styles.controlBtn,
            styles.btnOutline,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Text style={styles.btnOutlineText}>+1 Phút</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 14,
  },
  circleOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...HeronShadow.card,
  },
  circleIdle: {
    borderColor: HeronColors.border,
  },
  circleRunning: {
    borderColor: HeronColors.brand,
    backgroundColor: '#FFFAF8',
  },
  circleCompleted: {
    borderColor: HeronColors.emerald,
    backgroundColor: HeronColors.emeraldLight,
  },
  badgeState: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 8,
  },
  badgeStateText: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.granite,
    letterSpacing: 0.5,
  },
  badgeStateActive: {
    color: HeronColors.brand,
  },
  timeText: {
    fontSize: 46,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  timeCompletedText: {
    color: HeronColors.emerald,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '600',
    color: HeronColors.surface,
    marginTop: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  controlBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle,
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: HeronColors.primary,
  },
  mainBtn: {
    minWidth: 115,
    ...HeronShadow.brandGlow,
  },
  mainBtnStart: {
    backgroundColor: HeronColors.brand,
  },
  mainBtnPause: {
    backgroundColor: HeronColors.secondary,
  },
  mainBtnRestart: {
    backgroundColor: HeronColors.emerald,
  },
  mainBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
