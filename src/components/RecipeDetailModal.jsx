import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Image, Pressable, Share, Alert } from 'react-native';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleBadge } from './ui/AppleBadge';
import { AppleButton } from './ui/AppleButton';
import { useRecipes } from '../context/RecipeContext';
export const RecipeDetailModal = ({
  recipe,
  visible,
  onClose,
  onStartCooking
}) => {
  const {
    toggleFavorite,
    isFavorite,
    addToShoppingList
  } = useRecipes();
  const [checkedIngredients, setCheckedIngredients] = useState({});
  if (!recipe) return null;
  const isFav = isFavorite(recipe.id);
  const toggleCheck = id => {
    setCheckedIngredients(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const handleShare = async () => {
    try {
      const ingredientList = recipe.ingredients.map(i => `• ${i.name}: ${i.amount} ${i.unit}`).join('\n');
      await Share.share({
        message: `🍳 Công thức món "${recipe.title}" từ CookFlow:\n\n${recipe.description}\n\nNguyên liệu:\n${ingredientList}\n\nChúc bạn nấu ngon miệng! ✨`
      });
    } catch (e) {
      console.log('Share error', e);
    }
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Architectural Drag Handle */}
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={styles.iconCircle}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
          <View style={styles.topActions}>
            <Pressable onPress={handleShare} style={styles.iconCircle}>
              <Text style={styles.iconText}>📤</Text>
            </Pressable>
            <Pressable onPress={() => toggleFavorite(recipe.id)} style={[styles.iconCircle, isFav && styles.favActiveCircle]}>
              <Text style={styles.iconText}>{isFav ? '❤️' : '🤍'}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Image Card */}
          <View style={styles.imageContainer}>
            <Image source={{
            uri: recipe.imageUrl
          }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.categoryBadgeWrap}>
              <AppleBadge label={recipe.category} variant="coral" />
            </View>
            <View style={styles.featureBadgeWrap}>
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>🎥 VIDEO TỪNG BƯỚC</Text>
              </View>
              <View style={[styles.featureBadge, {
              backgroundColor: 'rgba(250, 54, 0, 0.92)'
            }]}>
                <Text style={styles.featureBadgeText}>⏱ ĐẾM GIỜ TỰ ĐỘNG</Text>
              </View>
            </View>
          </View>

          {/* Title & Description */}
          <View style={styles.infoBlock}>
            <View style={styles.metaHeader}>
              <Text style={styles.metaCode}>RECIPE SPEC // ID_{recipe.id.toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{recipe.title}</Text>
            <Text style={styles.description}>{recipe.description}</Text>
          </View>

          {/* Precision Stats Bar (Heron Grid Style) */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statKey}>THỜI GIAN</Text>
              <Text style={styles.statVal}>
                {recipe.prepTimeMinutes + recipe.cookTimeMinutes} phút
              </Text>
            </View>

            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statKey}>KHẨU PHẦN</Text>
              <Text style={styles.statVal}>{recipe.servings} người</Text>
            </View>

            <View style={[styles.statCell, styles.statCellBorder]}>
              <Text style={styles.statKey}>MỨC ĐỘ</Text>
              <Text style={styles.statVal}>{recipe.difficulty}</Text>
            </View>

            {recipe.calories ? <View style={[styles.statCell, styles.statCellBorder]}>
                <Text style={styles.statKey}>CALORIES</Text>
                <Text style={styles.statVal}>{recipe.calories} kcal</Text>
              </View> : null}
          </View>

          {/* Checklist Nguyên liệu */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLabelWrap}>
                <View style={styles.accentDot} />
                <Text style={styles.sectionTitle}>NGUYÊN LIỆU CHUẨN BỊ</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {Object.values(checkedIngredients).filter(Boolean).length}/{recipe.ingredients.length} SẴN SÀNG
              </Text>
            </View>

            <View style={styles.ingredientsListCard}>
              {recipe.ingredients.map((item, index) => {
              const isChecked = !!checkedIngredients[item.id];
              return <Pressable key={item.id || index} onPress={() => toggleCheck(item.id)} style={[styles.ingredientRow, index < recipe.ingredients.length - 1 && styles.rowDivider, isChecked && styles.checkedRow]}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                      {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={[styles.ingredientName, isChecked && styles.ingredientNameChecked]}>
                      {item.name}
                    </Text>
                    <View style={styles.amountBadge}>
                      <Text style={[styles.ingredientAmount, isChecked && styles.ingredientAmountChecked]}>
                        {item.amount} {item.unit}
                      </Text>
                    </View>
                  </Pressable>;
            })}
            </View>

            {/* Quick Add to Shopping List Button */}
            <Pressable onPress={() => {
            addToShoppingList(recipe.ingredients, recipe.title);
            Alert.alert('Thành công! 🛒', `Đã thêm ${recipe.ingredients.length} nguyên liệu của món "${recipe.title}" vào Danh sách đi chợ của bạn.`);
          }} style={({
            pressed
          }) => [styles.addShoppingListBtn, {
            transform: [{
              scale: pressed ? 0.98 : 1
            }]
          }]}>
              <Text style={styles.addShoppingListIcon}>🛒</Text>
              <Text style={styles.addShoppingListText}>
                THÊM {recipe.ingredients.length} NGUYÊN LIỆU VÀO DANH SÁCH ĐI CHỢ
              </Text>
            </Pressable>
          </View>


          {/* Tóm tắt các bước theo luồng Heron Wireframe */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLabelWrap}>
                <View style={styles.accentDot} />
                <Text style={styles.sectionTitle}>TIẾN TRÌNH THỰC HIỆN</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{recipe.steps.length} BƯỚC NẤU</Text>
            </View>

            <View style={styles.stepsPreviewCard}>
              {recipe.steps.map((step, idx) => <View key={step.stepNumber} style={styles.stepPreviewItem}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>
                      {step.stepNumber < 10 ? `0${step.stepNumber}` : step.stepNumber}
                    </Text>
                  </View>
                  <View style={styles.stepPreviewTextWrap}>
                    <View style={styles.stepTitleRow}>
                      <Text style={styles.stepPreviewTitle}>{step.title}</Text>
                      <View style={{
                    flexDirection: 'row',
                    gap: 6,
                    alignItems: 'center'
                  }}>
                        {step.videoUrl ? <AppleBadge label="VIDEO 🎥" variant="sky" /> : null}
                        {step.timerSeconds ? <AppleBadge label={`${Math.floor(step.timerSeconds / 60)}P ⏱`} variant="coral" /> : null}
                      </View>
                    </View>
                    <Text style={styles.stepPreviewInstruction} numberOfLines={2}>
                      {step.instruction}
                    </Text>
                  </View>
                </View>)}
            </View>
          </View>

          <View style={{
          height: 110
        }} />
        </ScrollView>

        {/* Sticky Action Footer (Heron Brand Flame Button) */}
        <View style={styles.stickyFooter}>
          <AppleButton title="BẮT ĐẦU NẤU CÙNG VIDEO & HẸN GIỜ ➔" size="lg" variant="primary" onPress={() => {
          onClose();
          onStartCooking(recipe);
        }} />
        </View>
      </View>
    </Modal>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HeronColors.canvas
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HeronColors.disable
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    zIndex: 10
  },
  topActions: {
    flexDirection: 'row',
    gap: 10
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  favActiveCircle: {
    backgroundColor: HeronColors.brandLight,
    borderColor: '#FFD8CF'
  },
  iconText: {
    fontSize: 16
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs
  },
  imageContainer: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    height: 230,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.card
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  categoryBadgeWrap: {
    position: 'absolute',
    top: 12,
    left: 12
  },
  featureBadgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
    alignItems: 'flex-end'
  },
  featureBadge: {
    backgroundColor: 'rgba(40, 40, 40, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  featureBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  infoBlock: {
    marginBottom: Spacing.lg
  },
  metaHeader: {
    marginBottom: 4
  },
  metaCode: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 1
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: -0.6,
    marginBottom: 8
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: HeronColors.granite
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.border,
    marginBottom: Spacing.xl,
    paddingVertical: 12,
    ...HeronShadow.subtle
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: HeronColors.borderLight
  },
  statKey: {
    fontSize: 10,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: HeronColors.primary
  },
  sectionWrap: {
    marginBottom: Spacing.xl
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  sectionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HeronColors.brand
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: HeronColors.surface,
    letterSpacing: 0.5
  },
  ingredientsListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: HeronColors.borderLight
  },
  checkedRow: {
    opacity: 0.45
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: HeronColors.disable,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF'
  },
  checkboxActive: {
    backgroundColor: HeronColors.emerald,
    borderColor: HeronColors.emerald
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: HeronColors.primary
  },
  ingredientNameChecked: {
    textDecorationLine: 'line-through',
    color: HeronColors.disable
  },
  amountBadge: {
    backgroundColor: HeronColors.cardAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: HeronColors.borderLight
  },
  ingredientAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: HeronColors.primary
  },
  ingredientAmountChecked: {
    textDecorationLine: 'line-through',
    color: HeronColors.disable
  },
  stepsPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: HeronColors.border,
    gap: 16,
    ...HeronShadow.subtle
  },
  stepPreviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '900',
    color: HeronColors.brand,
    fontVariant: ['tabular-nums']
  },
  stepPreviewTextWrap: {
    flex: 1
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  stepPreviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: HeronColors.primary,
    flex: 1
  },
  stepPreviewInstruction: {
    fontSize: 12,
    lineHeight: 18,
    color: HeronColors.granite
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(246, 246, 244, 0.95)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: HeronColors.border
  },
  addShoppingListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: 8
  },
  addShoppingListIcon: {
    fontSize: 16
  },
  addShoppingListText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  }
});