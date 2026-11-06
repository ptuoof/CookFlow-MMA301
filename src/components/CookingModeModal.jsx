import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { TimerCircle } from './ui/TimerCircle';
import { StepVideoPlayer } from './ui/StepVideoPlayer';
import { AppleButton } from './ui/AppleButton';
import { AiChefChatModal } from './AiChefChatModal';
import * as Speech from 'expo-speech';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRecipes } from '../context/RecipeContext';
import { confirmAction } from '../utils/dialog';
import { formatTimer } from './ui/TimerCircle';
import { scaleAmount } from '../utils/quantity';
import { pantryItemsUsedBy } from '../utils/pantry';
import { NOTE_MAX_LENGTH } from '../utils/history';
const KEEP_AWAKE_TAG = 'cookflow-cooking-mode';
const pad2 = n => String(n).padStart(2, '0');
// The step being cooked lives in the context's cooking session (persisted), not in this screen
export const CookingModeModal = ({
  recipe,
  visible,
  onClose
}) => {
  const {
    timers, getStepTimer, clearRecipeTimers, settings,
    cookingSession, cookingStepIndex, setCookingStep, endCookingSession,
    pantryIngredients, removePantryIngredients, recordCooking
  } = useRecipes();
  // Rating (1–5) and note saved to the cooking history when the dish is done
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [isCelebrationVisible, setIsCelebrationVisible] = useState(false);
  const [viewMode, setViewMode] = useState('video');
  const [isAiChatVisible, setIsAiChatVisible] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const lastAutoSpokenStep = useRef(null);
  const [showIngredients, setShowIngredients] = useState(false);
  // Pantry entries the user marks as used up when the dish is done
  const [usedUp, setUsedUp] = useState({});
  const totalSteps = recipe?.steps?.length ?? 0;
  const safeStepIndex = cookingStepIndex;
  const currentStep = recipe?.steps?.[safeStepIndex];
  const progressPercent = totalSteps ? Math.round((safeStepIndex + 1) / totalSteps * 100) : 0;
  const isLastStep = safeStepIndex === totalSteps - 1;
  const recipeTimers = timers.filter(timer => timer.recipeId === recipe?.id);
  const currentStepTimer = recipe && currentStep ? getStepTimer(recipe.id, currentStep.id) : null;
  // Servings chosen on the detail screen: ingredient amounts and the AI follow them
  const servings = cookingSession?.servings ?? recipe?.servings ?? 1;
  const ratio = servings / Math.max(1, recipe?.servings || 1);
  const usedPantryItems = useMemo(() => recipe ? pantryItemsUsedBy(recipe, pantryIngredients) : [], [recipe, pantryIngredients]);
  useEffect(() => {
    setVoiceEnabled(false);
    setIsCelebrationVisible(false);
    setViewMode('video');
    setShowIngredients(false);
    setUsedUp({});
    setRating(0);
    setNote('');
  }, [recipe?.id]);
  // Optional custom timer tab only applies to the step where it was opened
  useEffect(() => {
    setViewMode('video');
  }, [safeStepIndex]);
  // Keep the screen on while cooking (setting in Cài đặt)
  useEffect(() => {
    if (!visible || !settings.keepAwake || Platform.OS === 'web') return undefined;
    Promise.resolve(activateKeepAwakeAsync(KEEP_AWAKE_TAG)).catch(() => {});
    return () => {
      Promise.resolve().then(() => deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
    };
  }, [visible, settings.keepAwake]);
  useEffect(() => {
    if (visible && voiceEnabled && currentStep) {
      const stepKey = `${recipe.id}:${safeStepIndex}`;
      if (lastAutoSpokenStep.current === stepKey) return;
      lastAutoSpokenStep.current = stepKey;
      Speech.stop();
      Speech.speak(`Bước ${currentStep.stepNumber}: ${currentStep.title}. ${currentStep.instruction}`, { language: 'vi-VN' });
    }
    return () => { Speech.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, voiceEnabled, recipe?.id, safeStepIndex]);
  const speakCurrentStep = () => {
    if (!currentStep) return;
    lastAutoSpokenStep.current = `${recipe.id}:${safeStepIndex}`;
    Speech.stop();
    Speech.speak(`Bước ${currentStep.stepNumber}: ${currentStep.title}. ${currentStep.instruction}`, { language: 'vi-VN' });
  };
  const toggleVoice = () => {
    if (voiceEnabled) {
      Speech.stop();
      setVoiceEnabled(false);
      return;
    }
    setVoiceEnabled(true);
    // Start on the press handler so browsers requiring a user gesture allow speech.
    speakCurrentStep();
  };
  if (!recipe || !currentStep) return null;
  const handleNext = () => {
    const advance = () => {
      if (isLastStep) {
        Speech.stop();
        setIsCelebrationVisible(true);
      } else {
        setCookingStep(safeStepIndex + 1);
      }
    };
    // Leaving a step whose timer is still counting is allowed, but never by accident
    if (currentStepTimer?.status === 'running') {
      confirmAction({
        title: 'Timer bước này vẫn đang chạy',
        message: `Còn ${formatTimer(currentStepTimer.secondsLeft)}. Timer vẫn tiếp tục đếm và sẽ báo khi hết giờ.`,
        confirmText: isLastStep ? 'Vẫn hoàn thành' : 'Sang bước tiếp',
        cancelText: 'Ở lại',
        onConfirm: advance
      });
      return;
    }
    advance();
  };
  const handlePrev = () => {
    if (safeStepIndex > 0) {
      setCookingStep(safeStepIndex - 1);
    }
  };
  const handleExit = () => {
    const activeTimers = recipeTimers.filter(timer => timer.status !== 'done');
    confirmAction({
      title: 'Tạm rời chế độ nấu?',
      message: activeTimers.length
        ? `${activeTimers.map(timer => `Timer "${timer.stepTitle}" (${formatTimer(timer.secondsLeft)})`).join(', ')} vẫn tiếp tục chạy. Bạn có thể mở lại từ thanh timer ở màn hình chính.`
        : `Tiến độ (bước ${safeStepIndex + 1}/${totalSteps}) được lưu lại, kể cả khi tắt ứng dụng. Mở lại từ thanh "Đang nấu dở" phía trên thanh menu.`,
      confirmText: 'Rời đi',
      cancelText: 'Tiếp tục nấu',
      onConfirm: () => {
        Speech.stop();
        onClose();
      }
    });
  };
  const handleFinishCooking = () => {
    Speech.stop();
    clearRecipeTimers(recipe.id);
    removePantryIngredients(usedPantryItems.filter(name => usedUp[name]));
    recordCooking({ recipe, servings, startedAt: cookingSession?.startedAt, rating, note });
    setIsCelebrationVisible(false);
    setUsedUp({});
    setRating(0);
    setNote('');
    endCookingSession();
    onClose();
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" transparent={false} onRequestClose={handleExit}>
      <SafeAreaView style={styles.container}>
        {/* Precision Header with Hairline Progress */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={handleExit} style={styles.exitButton}>
              <Text style={styles.exitText}>✕ ĐÓNG</Text>
            </Pressable>

            <Pressable onPress={toggleVoice} style={styles.exitButton}>
              <Text style={styles.exitText}>{voiceEnabled ? '🔊 TẮT ĐỌC' : '🔊 ĐỌC TỰ ĐỘNG'}</Text>
            </Pressable>

            <View style={styles.phaseBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.phaseText}>
                GIAI ĐOẠN {pad2(safeStepIndex + 1)} // {pad2(totalSteps)}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <Pressable onPress={() => setIsAiChatVisible(true)} style={styles.aiButton}>
                <Text style={styles.aiButtonText}>🤖 AI</Text>
              </Pressable>
              <Text style={styles.percentText}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Hairline Progress Track */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
            width: `${progressPercent}%`
          }]} />
          </View>
        </View>

        {/* Step Content */}
        <ScrollView style={{
        flex: 1,
        width: '100%'
      }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Step Video Player Component */}
          <StepVideoPlayer key={`video_${recipe.id}_step_${currentStep.stepNumber}`} videoUrl={currentStep.videoUrl || recipe.videoUrl} fallbackImage={currentStep.image || recipe.imageUrl} stepNumber={currentStep.stepNumber} stepTitle={currentStep.title} />

          {/* View Mode Switcher: Video vs Timer */}
          <View style={styles.modeSwitcher}>
            <Pressable onPress={() => setViewMode('video')} style={[styles.modeBtn, viewMode === 'video' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, viewMode === 'video' && styles.modeBtnTextActive]}>
                📝 HƯỚNG DẪN CHI TIẾT
              </Text>
            </Pressable>

            <Pressable onPress={() => setViewMode('timer')} style={[styles.modeBtn, viewMode === 'timer' && styles.modeBtnActive]}>
              <Text style={[styles.modeBtnText, viewMode === 'timer' && styles.modeBtnTextActive]}>
                ⏱ ĐẾM GIỜ BƯỚC NÀY {currentStep.timerSeconds ? `(${Math.floor(currentStep.timerSeconds / 60)}P)` : ''}
              </Text>
            </Pressable>
          </View>

          {/* Ingredients scaled to the servings being cooked */}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showIngredients }} onPress={() => setShowIngredients(open => !open)} style={styles.ingredientsToggle}>
            <Text style={styles.ingredientsToggleText}>
              🧾 NGUYÊN LIỆU CHO {servings} NGƯỜI{servings !== recipe.servings ? ` (GỐC ${recipe.servings})` : ''}
            </Text>
            <Text style={styles.ingredientsToggleText}>{showIngredients ? '▴' : '▾'}</Text>
          </Pressable>
          {showIngredients ? <View style={styles.ingredientsPanel}>
              {recipe.ingredients.map(item => <View key={item.id} style={styles.ingredientLine}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientAmount}>{scaleAmount(item.amount, ratio)} {item.unit}</Text>
                </View>)}
              {ratio !== 1 ? <Text style={styles.ingredientsNote}>
                  Định lượng trong lời hướng dẫn từng bước được viết cho {recipe.servings} người — hãy dùng số ở bảng này.
                </Text> : null}
            </View> : null}

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
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => { Speech.stop(); setVoiceEnabled(false); }} style={styles.voiceControl}><Text style={styles.voiceControlText}>Dừng đọc</Text></Pressable>
              <Pressable onPress={speakCurrentStep} style={styles.voiceControl}><Text style={styles.voiceControlText}>Nghe lại</Text></Pressable>
            </View>

            {/* Mẹo nhỏ (Tip) */}
            {currentStep.tip ? <View style={styles.tipBox}>
                <View style={styles.tipHeader}>
                  <Text style={styles.tipTag}>GHI CHÚ HƯỚNG DẪN // KINH NGHIỆM ĐẦU BẾP</Text>
                </View>
                <Text style={styles.tipText}>{currentStep.tip}</Text>
              </View> : null}

            {/* Bộ đếm giờ Timer đếm ngược (nếu bước có timerSeconds hoặc user chọn tab timer) */}
            {currentStep.timerSeconds || viewMode === 'timer' ? <View style={styles.timerSection}>
                <View style={styles.timerSectionHeader}>
                  <View style={styles.timerSectionDot} />
                  <Text style={styles.timerSectionTitle}>
                    BỘ ĐẾM GIỜ CHUẨN XÁC CHO GIAI ĐOẠN NÀY
                  </Text>
                </View>

                <TimerCircle key={`timer_${recipe.id}_${safeStepIndex}`} recipe={recipe} stepIndex={safeStepIndex} defaultSeconds={currentStep.timerSeconds || 180} />
              </View> : null}
          </View>

          <View style={{
          height: 20
        }} />
        </ScrollView>

        {/* Bottom Navigation Dock */}
        <View style={styles.footer}>
          <Pressable onPress={handlePrev} disabled={safeStepIndex === 0} style={[styles.navBtn, styles.prevBtn, safeStepIndex === 0 && styles.btnDisabled]}>
            <Text style={styles.prevBtnText}>‹ BƯỚC TRƯỚC</Text>
          </Pressable>

          <Pressable onPress={handleNext} style={[styles.navBtn, styles.nextBtn, isLastStep && styles.finishBtn]}>
            <Text style={styles.nextBtnText}>
              {isLastStep ? 'HOÀN THÀNH MÓN ĂN ✓' : 'BƯỚC TIẾP THEO ›'}
            </Text>
          </Pressable>
        </View>

        {/* Overlay Chúc mừng hoàn thành món ăn */}
        {isCelebrationVisible && <View style={styles.celebrationOverlay}>
            {/* Scrolls on small screens: rating, note and pantry choices make the card tall */}
            <ScrollView style={styles.celebrationScroll} contentContainerStyle={styles.celebrationScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                  {totalSteps} BƯỚC • {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} PHÚT THEO CÔNG THỨC
                </Text>
              </View>

              {/* Rating + note, saved to "Của tôi → Đã nấu" */}
              <View style={styles.usedUpBox}>
                <Text style={styles.usedUpTitle}>Món lần này thế nào?</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} sao`} accessibilityState={{ selected: rating === value }} hitSlop={4} onPress={() => setRating(current => current === value ? 0 : value)} style={styles.starBtn}>
                      <Text style={[styles.starText, value <= rating && styles.starTextActive]}>★</Text>
                    </Pressable>)}
                </View>
                <TextInput style={styles.noteInput} placeholder="Ghi chú cho lần sau (ví dụ: bớt đường, nấu thêm 5 phút)…" placeholderTextColor={HeronColors.disable} value={note} onChangeText={setNote} maxLength={NOTE_MAX_LENGTH} multiline />
              </View>

              {usedPantryItems.length ? <View style={styles.usedUpBox}>
                  <Text style={styles.usedUpTitle}>Nguyên liệu nào trong tủ lạnh đã dùng hết?</Text>
                  <View style={styles.usedUpChips}>
                    {usedPantryItems.map(name => <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked: !!usedUp[name] }} onPress={() => setUsedUp(prev => ({ ...prev, [name]: !prev[name] }))} style={[styles.usedUpChip, usedUp[name] && styles.usedUpChipActive]}>
                        <Text style={[styles.usedUpChipText, usedUp[name] && styles.usedUpChipTextActive]}>{usedUp[name] ? '✓ ' : ''}{name}</Text>
                      </Pressable>)}
                  </View>
                  <Text style={styles.usedUpHint}>Mục đã chọn sẽ được bỏ khỏi tủ lạnh khi xác nhận.</Text>
                </View> : null}

              <AppleButton title="XÁC NHẬN & QUAY VỀ TRANG CHỦ" size="lg" variant="primary" onPress={handleFinishCooking} style={{
            width: '100%'
          }} />
              <Pressable onPress={() => setIsCelebrationVisible(false)} style={styles.celebrationBack}>
                <Text style={styles.celebrationBackText}>‹ Quay lại bước cuối</Text>
              </Pressable>
            </View>
            </ScrollView>
          </View>}

        <AiChefChatModal visible={isAiChatVisible} onClose={() => setIsAiChatVisible(false)} recipe={recipe} currentStep={currentStep} servings={servings} />
      </SafeAreaView>
    </Modal>;
};
const styles = StyleSheet.create({
  ingredientsToggle: {
    minHeight: 44,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: HeronColors.card,
    borderWidth: 1,
    borderColor: HeronColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  ingredientsToggleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: HeronColors.inkPrimary
  },
  ingredientsPanel: {
    marginTop: 8,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: HeronColors.card,
    borderWidth: 1,
    borderColor: HeronColors.borderLight,
    gap: 8
  },
  ingredientLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: HeronColors.inkPrimary
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: HeronColors.brand
  },
  ingredientsNote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: HeronColors.granite
  },
  usedUpBox: {
    width: '100%',
    marginBottom: 16,
    gap: 8
  },
  usedUpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.inkPrimary
  },
  usedUpChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  usedUpChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: HeronColors.border,
    justifyContent: 'center'
  },
  usedUpChipActive: {
    backgroundColor: HeronColors.inkPrimary,
    borderColor: HeronColors.inkPrimary
  },
  usedUpChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: HeronColors.secondary
  },
  usedUpChipTextActive: {
    color: '#FFFFFF'
  },
  usedUpHint: {
    fontSize: 12,
    color: HeronColors.granite
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4
  },
  starBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  starText: {
    fontSize: 30,
    color: HeronColors.border
  },
  starTextActive: {
    color: '#F59F00'
  },
  noteInput: {
    minHeight: 56,
    maxHeight: 96,
    borderWidth: 1,
    borderColor: HeronColors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: HeronColors.inkPrimary,
    backgroundColor: HeronColors.cardAlt,
    textAlignVertical: 'top'
  },
  celebrationBack: {
    marginTop: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  celebrationBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: HeronColors.granite
  },
  container: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  header: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: HeronColors.border
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  exitText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.secondary,
    letterSpacing: 0.5
  },
  voiceControl: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt },
  voiceControlText: { color: HeronColors.primary, fontSize: 12, fontWeight: '700' },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.borderLight
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  aiButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: HeronColors.brandLight,
    borderWidth: 1,
    borderColor: '#FFD8CF'
  },
  aiButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.brand,
    letterSpacing: 0.4
  },
  percentText: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.brand,
    fontVariant: ['tabular-nums']
  },
  progressTrack: {
    height: 3,
    backgroundColor: HeronColors.borderLight,
    width: '100%'
  },
  progressFill: {
    height: '100%',
    backgroundColor: HeronColors.brand
  },
  scrollContent: {
    padding: Spacing.lg,
    width: '100%',
    alignSelf: 'stretch'
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 16,
    width: '100%'
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeBtnActive: {
    backgroundColor: HeronColors.primary
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  },
  modeBtnTextActive: {
    color: '#FFFFFF'
  },
  stepCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card
  },
  stepMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  recipeCodeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 0.8
  },
  stepSeq: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.5,
    marginBottom: 12,
    lineHeight: 28
  },
  stepInstruction: {
    fontSize: 15,
    lineHeight: 24,
    color: HeronColors.secondary,
    fontWeight: '500',
    marginBottom: 16
  },
  tipBox: {
    backgroundColor: HeronColors.cardAlt,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 18
  },
  tipHeader: {
    marginBottom: 4
  },
  tipTag: {
    fontSize: 10,
    fontWeight: '900',
    color: HeronColors.amber,
    letterSpacing: 0.8
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
    color: HeronColors.primary
  },
  timerSection: {
    borderTopWidth: 1,
    borderTopColor: HeronColors.borderLight,
    paddingTop: 16,
    alignItems: 'center'
  },
  timerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  timerSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand
  },
  timerSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.6
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: HeronColors.border,
    gap: 12
  },
  navBtn: {
    flex: 1,
    height: 50,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  prevBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  prevBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.primary,
    letterSpacing: 0.5
  },
  nextBtn: {
    backgroundColor: HeronColors.brand,
    ...HeronShadow.brandGlow
  },
  finishBtn: {
    backgroundColor: HeronColors.emerald
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  btnDisabled: {
    opacity: 0.35
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
    elevation: 20
  },
  celebrationScroll: {
    width: '100%'
  },
  celebrationScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 12
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.dock
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
    marginBottom: 16
  },
  celebrationIcon: {
    fontSize: 26,
    color: HeronColors.emerald,
    fontWeight: '900'
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: 'center'
  },
  celebrationSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: HeronColors.granite,
    textAlign: 'center',
    marginBottom: 18
  },
  celebrationMeta: {
    backgroundColor: HeronColors.cardAlt,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: 24
  },
  celebrationMetaText: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  }
});
