import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Recipe } from '../types/recipe';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { TimerCircle } from './ui/TimerCircle';
import { StepVideoPlayer } from './ui/StepVideoPlayer';
import { AppleButton } from './ui/AppleButton';

interface CookingModeModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({
  recipe,
  visible,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'video' | 'timer'>('video');

  if (!recipe) return null;

  const currentStep = recipe.steps[currentStepIndex];
  const totalSteps = recipe.steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      setIsCelebrationVisible(true);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Dừng phiên nấu ăn?',
      'Bạn có chắc muốn thoát chế độ Cooking Assistant này không?',
      [
        { text: 'Tiếp tục nấu', style: 'cancel' },
        {
          text: 'Thoát ra',
          style: 'destructive',
          onPress: () => {
            setCurrentStepIndex(0);
            onClose();
          },
        },
      ]
    );
  };

  const handleFinishCooking = () => {
    setIsCelebrationVisible(false);
    setCurrentStepIndex(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={handleExit}
    >
      <SafeAreaView style={styles.container}>
        {/* Precision Header with Hairline Progress */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={handleExit} style={styles.exitButton}>
              <Text style={styles.exitText}>✕ ĐÓNG</Text>
            </Pressable>

            <View style={styles.phaseBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.phaseText}>
                GIAI ĐOẠN 0{currentStepIndex + 1} // 0{totalSteps}
              </Text>
            </View>

            <Text style={styles.percentText}>{progressPercent}%</Text>
          </View>

          {/* Hairline Progress Track */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Step Content */}
        <ScrollView style={{ flex: 1, width: '100%' }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Step Video Player Component */}
          <StepVideoPlayer
            key={`video_${recipe.id}_step_${currentStep.stepNumber}`}
            videoUrl={currentStep.videoUrl || recipe.videoUrl}
            fallbackImage={currentStep.image || recipe.imageUrl}
            stepNumber={currentStep.stepNumber}
            stepTitle={currentStep.title}
          />

          {/* View Mode Switcher: Video vs Timer */}
          <View style={styles.modeSwitcher}>
            <Pressable
              onPress={() => setViewMode('video')}
              style={[styles.modeBtn, viewMode === 'video' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, viewMode === 'video' && styles.modeBtnTextActive]}>
                📝 HƯỚNG DẪN CHI TIẾT
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode('timer')}
              style={[styles.modeBtn, viewMode === 'timer' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, viewMode === 'timer' && styles.modeBtnTextActive]}>
                ⏱ ĐẾM GIỜ BƯỚC NÀY {currentStep.timerSeconds ? `(${Math.floor(currentStep.timerSeconds / 60)}P)` : ''}
              </Text>
            </Pressable>
          </View>

          {/* Main Step Card */}
          <View style={styles.stepCard}>
            <View style={styles.stepMetaRow}>
              <Text style={styles.recipeCodeTitle}>
                {recipe.title.toUpperCase()}
              </Text>
              <Text style={styles.stepSeq}>BƯỚC #{currentStep.stepNumber}</Text>
            </View>

            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>

            {/* Mẹo nhỏ (Tip) */}
            {currentStep.tip ? (
              <View style={styles.tipBox}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipTag}>GHI CHÚ HƯỚNG DẪN // KINH NGHIỆM ĐẦU BẾP</Text>
                </View>
                <Text style={styles.tipText}>{currentStep.tip}</Text>
              </View>
            ) : null}

            {/* Bộ đếm giờ Timer đếm ngược (nếu bước có timerSeconds hoặc user chọn tab timer) */}
            {(currentStep.timerSeconds || viewMode === 'timer') ? (
              <View style={styles.timerSection}>
                <View style={styles.timerSectionHeader}>
                  <View style={styles.timerSectionDot} />
                  <Text style={styles.timerSectionTitle}>
                    BỘ ĐẾM GIỜ CHUẨN XÁC CHO GIAI ĐOẠN NÀY
                  </Text>
                </View>

                <TimerCircle
                  key={`timer_${recipe.id}_${currentStepIndex}`}
                  initialSeconds={currentStep.timerSeconds || 180}
                  onFinish={() => {
                    Alert.alert(
                      '⏰ ĐÃ HẾT GIỜ BƯỚC NẤU!',
                      `Bạn đã hoàn thành giai đoạn "${currentStep.title}". Hãy chuyển sang bước tiếp theo để đảm bảo hương vị chuẩn nhất!`,
                      [{ text: 'ĐÃ HIỂU ✓' }]
                    );
                  }}
                />
              </View>
            ) : null}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom Navigation Dock */}
        <View style={styles.footer}>
          <Pressable
            onPress={handlePrev}
            disabled={currentStepIndex === 0}
            style={[styles.navBtn, styles.prevBtn, currentStepIndex === 0 && styles.btnDisabled]}
          >
            <Text style={styles.prevBtnText}>‹ BƯỚC TRƯỚC</Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            style={[styles.navBtn, styles.nextBtn, isLastStep && styles.finishBtn]}
          >
            <Text style={styles.nextBtnText}>
              {isLastStep ? 'HOÀN THÀNH MÓN ĂN ✓' : 'BƯỚC TIẾP THEO ›'}
            </Text>
          </Pressable>
        </View>

        {/* Overlay Chúc mừng hoàn thành món ăn */}
        {isCelebrationVisible && (
          <View style={styles.celebrationOverlay}>
            <View style={styles.celebrationCard}>
              <View style={styles.celebrationIconBadge}>
                <Text style={styles.celebrationIcon}>✓</Text>
              </View>
              <Text style={styles.celebrationTitle}>MÓN ĂN ĐÃ HOÀN THÀNH</Text>
              <Text style={styles.celebrationSubtitle}>
                Bạn đã hoàn thành chính xác toàn bộ quy trình nấu "{recipe.title}". Chúc bạn thưởng thức một bữa ăn trọn vị và ngon miệng!
              </Text>

              <View style={styles.celebrationMeta}>
                <Text style={styles.celebrationMetaText}>
                  TRẠNG THÁI: KIỂM SOÁT THỜI GIAN & VIDEO CHUẨN XÁC 100%
                </Text>
              </View>

              <AppleButton
                title="XÁC NHẬN & QUAY VỀ TRANG CHỦ"
                size="lg"
                variant="primary"
                onPress={handleFinishCooking}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HeronColors.canvas,
  },
  header: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: HeronColors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
  },
  exitText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.secondary,
    letterSpacing: 0.5,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.borderLight,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.brand,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 3,
    backgroundColor: HeronColors.borderLight,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: HeronColors.brand,
  },
  scrollContent: {
    padding: Spacing.lg,
    width: '100%',
    alignSelf: 'stretch',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 16,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: HeronColors.primary,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  stepCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card,
  },
  stepMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recipeCodeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 0.8,
  },
  stepSeq: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 28,
  },
  stepInstruction: {
    fontSize: 15,
    lineHeight: 24,
    color: HeronColors.secondary,
    fontWeight: '500',
    marginBottom: 16,
  },
  tipBox: {
    backgroundColor: HeronColors.cardAlt,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 18,
  },
  tipHeader: {
    marginBottom: 4,
  },
  tipTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.amber,
    letterSpacing: 0.8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
    color: HeronColors.primary,
  },
  timerSection: {
    borderTopWidth: 1,
    borderTopColor: HeronColors.borderLight,
    paddingTop: 16,
    alignItems: 'center',
  },
  timerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timerSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand,
  },
  timerSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: HeronColors.border,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    height: 50,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle,
  },
  prevBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.primary,
    letterSpacing: 0.5,
  },
  nextBtn: {
    backgroundColor: HeronColors.brand,
    ...HeronShadow.brandGlow,
  },
  finishBtn: {
    backgroundColor: HeronColors.emerald,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(40,40,40,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 999,
    elevation: 20,
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.dock,
  },
  celebrationIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: HeronColors.emeraldLight,
    borderWidth: 2,
    borderColor: HeronColors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  celebrationIcon: {
    fontSize: 26,
    color: HeronColors.emerald,
    fontWeight: '900',
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: HeronColors.granite,
    textAlign: 'center',
    marginBottom: 18,
  },
  celebrationMeta: {
    backgroundColor: HeronColors.cardAlt,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 24,
  },
  celebrationMetaText: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5,
  },
});
