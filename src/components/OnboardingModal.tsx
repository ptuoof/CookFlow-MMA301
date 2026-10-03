import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';

const { width } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SlideStep {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accentColor: string;
  highlights: string[];
}

const ONBOARDING_SLIDES: SlideStep[] = [
  {
    id: 1,
    badge: 'LUỒNG 1: KHÁM PHÁ CÔNG THỨC',
    title: 'Kho Tàng 500+ Món Ăn Đặc Sắc 🍳',
    subtitle: 'Tìm kiếm thông minh theo nguyên liệu trong tủ lạnh',
    description:
      'Khám phá thực đơn đa dạng từ món ăn gia đình, ăn kiêng healthy, tráng miệng đến các loại thức uống pha chế đỉnh cao.',
    icon: '🍲',
    accentColor: '#FF6B6B',
    highlights: [
      'Lọc theo danh mục: Món nhanh, Món chính, Ăn kiêng...',
      'Tìm kiếm theo nguyên liệu có sẵn trong căn bếp',
      'Đánh dấu yêu thích món ăn chỉ với 1 chạm',
    ],
  },
  {
    id: 2,
    badge: 'LUỒNG 2: TRỢ LÝ NẤU ĂN TRỰC TIẾP',
    title: 'Chế Độ Nấu Từng Bước & Timer ⏱️',
    subtitle: 'Màn hình không bao giờ tắt - Chuông báo chuẩn xác',
    description:
      'CookFlow đồng hành cùng bạn trong từng thao tác nấu nướng với bộ đếm giờ tự động và hướng dẫn chi tiết từng công đoạn.',
    icon: '👨‍🍳',
    accentColor: '#4ECDC4',
    highlights: [
      'Bấm giờ hẹn giờ thông minh theo từng bước nấu',
      'Màn hình luôn sáng giúp bạn thao tác rảnh tay',
      'Âm thanh & Rung phản hồi khi hoàn tất đếm ngược',
    ],
  },
  {
    id: 3,
    badge: 'LUỒNG 3: QUẢN LÝ ĐI CHỢ',
    title: 'Danh Sách Đi Chợ 1-Click 🛒',
    subtitle: 'Không lo quên mua gia vị hay nguyên liệu chính',
    description:
      'Chuyển toàn bộ nguyên liệu từ bất kỳ công thức nào sang checklist đi chợ cá nhân chỉ với 1 cú bấm.',
    icon: '🛍️',
    accentColor: '#FFE66D',
    highlights: [
      'Tự động gom nhóm nguyên liệu theo từng món ăn',
      'Đánh dấu gạch bỏ thông minh khi đã bỏ vào giỏ',
      'Thêm nguyên liệu mua tự do dễ dàng',
    ],
  },
  {
    id: 4,
    badge: 'LUỒNG 4: SÁNG TẠO THỰC ĐƠN CÁ NHÂN',
    title: 'Viết Công Thức Độc Quyền ✍️',
    subtitle: 'Lưu giữ hương vị gia đình & bí kíp riêng',
    description:
      'Tự do sáng tạo và lưu trữ các món ăn riêng của bạn với đầy đủ độ khó, thời gian, thành phần và các bước thực hiện.',
    icon: '✨',
    accentColor: '#1A535C',
    highlights: [
      'Tùy chỉnh khẩu phần & màu sắc nhận diện',
      'Quản lý danh sách công thức tự sáng tạo',
      'Chỉnh sửa & Cập nhật bí kíp linh hoạt',
    ],
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onClose }) => {
  const { completeOnboarding } = useRecipes();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_SLIDES.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    onClose();
  };

  const slide = ONBOARDING_SLIDES[currentStep];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleFinish}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {currentStep + 1} / {ONBOARDING_SLIDES.length}
              </Text>
            </View>

            <Pressable onPress={handleFinish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Bỏ qua ✕</Text>
            </Pressable>
          </View>

          {/* Slide Progress Indicator Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentStep + 1) / ONBOARDING_SLIDES.length) * 100}%` },
              ]}
            />
          </View>

          {/* Main Slide Card */}
          <ScrollView
            contentContainerStyle={styles.slideContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Visual Icon Hero Container */}
            <View
              style={[
                styles.iconHeroBox,
                { backgroundColor: slide.accentColor + '1E', borderColor: slide.accentColor },
              ]}
            >
              <Text style={styles.iconHeroText}>{slide.icon}</Text>
            </View>

            {/* Category Tag */}
            <View style={styles.tagWrap}>
              <Text style={[styles.tagText, { color: slide.accentColor }]}>
                {slide.badge}
              </Text>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            <Text style={styles.slideDesc}>{slide.description}</Text>

            {/* Feature Highlights List */}
            <View style={styles.highlightsBox}>
              <Text style={styles.highlightsHeader}>TÍNH NĂNG NỔI BẬT:</Text>
              {slide.highlights.map((item, idx) => (
                <View key={idx} style={styles.highlightRow}>
                  <View style={[styles.bulletDot, { backgroundColor: slide.accentColor }]} />
                  <Text style={styles.highlightText}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Bottom Actions Row */}
          <View style={styles.bottomBar}>
            {currentStep > 0 ? (
              <Pressable onPress={handlePrev} style={styles.prevBtn}>
                <Text style={styles.prevBtnText}>← Trở lại</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {/* Dots navigation */}
            <View style={styles.dotsRow}>
              {ONBOARDING_SLIDES.map((_, idx) => (
                <Pressable key={idx} onPress={() => setCurrentStep(idx)}>
                  <View
                    style={[
                      styles.dot,
                      currentStep === idx && [
                        styles.dotActive,
                        { backgroundColor: slide.accentColor },
                      ],
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            {/* Next / Finish Button */}
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: slide.accentColor },
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === ONBOARDING_SLIDES.length - 1
                  ? 'Bắt Đầu Nấu 🚀'
                  : 'Tiếp Theo →'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...HeronShadow.card,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: HeronColors.inkPrimary,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: HeronColors.disable,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: HeronColors.accentFlame,
    borderRadius: 2,
  },
  slideContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  iconHeroBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconHeroText: {
    fontSize: 44,
  },
  tagWrap: {
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: HeronColors.inkPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: HeronColors.accentFlame,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  highlightsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.inkPrimary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  prevBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 1,
  },
  prevBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: HeronColors.disable,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
  },
  nextBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    flex: 1.2,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
