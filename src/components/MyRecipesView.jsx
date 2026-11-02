import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { confirmAction } from '../utils/dialog';
import { totalMinutes } from '../utils/recipeModel';
import { formatCookedDay } from '../utils/history';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { AppleBadge } from './ui/AppleBadge';
import { useRecipes } from '../context/RecipeContext';
const EMPTY_TEXT = {
  favorites: ['CHƯA CÓ CÔNG THỨC LƯU', 'Hãy thả tim các món bạn quan tâm tại trang Khám phá để lưu trữ vào kho cá nhân.'],
  custom: ['CHƯA CÓ CÔNG THỨC TỰ TẠO', 'Nhấn nút “+” ở thanh điều hướng để khởi tạo công thức nấu ăn của riêng bạn.'],
  history: ['CHƯA NẤU MÓN NÀO', 'Hoàn thành một món trong Chế độ nấu để lưu lịch sử, đánh giá và ghi chú cho lần sau.']
};
export const MyRecipesView = ({
  onSelectRecipe,
  onEditRecipe
}) => {
  const {
    recipes,
    favoriteIds,
    deleteRecipe,
    timers,
    cookHistory,
    deleteHistoryEntry,
    getRecipeById
  } = useRecipes();
  const [activeTab, setActiveTab] = useState('favorites');
  const favoriteRecipes = recipes.filter(r => favoriteIds.includes(r.id));
  const customRecipes = recipes.filter(r => r.isCustom);
  const handleDelete = recipe => {
    const isCooking = timers.some(timer => timer.recipeId === recipe.id);
    confirmAction({
      title: 'Xóa công thức?',
      message: `Công thức "${recipe.title}" sẽ bị xóa vĩnh viễn${isCooking ? ' và timer đang chạy của món này sẽ dừng' : ''}. Lịch sử nấu món này vẫn được giữ.`,
      confirmText: 'Xóa vĩnh viễn',
      destructive: true,
      onConfirm: () => deleteRecipe(recipe.id)
    });
  };
  const handleDeleteHistory = entry => confirmAction({
    title: 'Xóa lần nấu này?',
    message: `"${entry.recipeTitle}" — ${formatCookedDay(entry.finishedAt)}.`,
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: () => deleteHistoryEntry(entry.id)
  });
  const currentList = activeTab === 'favorites' ? favoriteRecipes : activeTab === 'custom' ? customRecipes : cookHistory;
  const renderSegment = (tab, label, count) => <Pressable onPress={() => setActiveTab(tab)} style={[styles.segmentBtn, activeTab === tab && styles.segmentBtnActive]}>
      <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
        {label} [{count}]
      </Text>
    </Pressable>;
  const renderHistoryEntry = entry => {
    const recipe = getRecipeById(entry.recipeId);
    return <Pressable key={entry.id} disabled={!recipe} onPress={() => onSelectRecipe(recipe)} onLongPress={() => handleDeleteHistory(entry)} style={styles.historyCard}>
        <View style={styles.historyTop}>
          <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={1}>{entry.recipeTitle}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Xóa lần nấu này" hitSlop={8} onPress={() => handleDeleteHistory(entry)}>
            <Text style={styles.historyDelete}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.historyMeta}>
          {formatCookedDay(entry.finishedAt)} • {entry.servings} người{entry.rating ? ` • ${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}` : ''}{recipe ? '' : ' • món đã bị xóa'}
        </Text>
        {entry.note ? <Text style={styles.historyNote}>“{entry.note}”</Text> : null}
      </Pressable>;
  };
  return <View style={styles.container}>
      {/* Heron Minimalist Segmented Control */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmentedControl}>
          {renderSegment('favorites', 'ĐÃ LƯU', favoriteRecipes.length)}
          {renderSegment('custom', 'TỰ TẠO', customRecipes.length)}
          {renderSegment('history', 'ĐÃ NẤU', cookHistory.length)}
        </View>
      </View>

      {/* List / Empty State */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {currentList.length === 0 ? <View style={styles.emptyContainer}>
            <View style={styles.emptySquare}>
              <Text style={styles.emptySquareIcon}>∅</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {EMPTY_TEXT[activeTab][0]}
            </Text>
            <Text style={styles.emptySubtitle}>
              {EMPTY_TEXT[activeTab][1]}
            </Text>
          </View> : activeTab === 'history' ? cookHistory.map(renderHistoryEntry) : currentList.map(item => <Pressable key={item.id} onPress={() => onSelectRecipe(item)} style={({
        pressed
      }) => [styles.card, {
        transform: [{
          scale: pressed ? 0.98 : 1
        }]
      }]}>
              <Image source={{
          uri: item.imageUrl
        }} style={styles.cardImage} resizeMode="cover" />

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <AppleBadge label={item.category} variant="coral" />
                  <Text style={styles.timeText}>
                    ⏱ {totalMinutes(item)}P
                  </Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Sửa / Xóa */}
                {activeTab === 'custom' ? <View style={styles.actionRow}>
                    <Pressable onPress={e => {
              e.stopPropagation();
              onEditRecipe(item);
            }} style={styles.actionBtnEdit}>
                      <Text style={styles.actionBtnEditText}>SỬA</Text>
                    </Pressable>

                    <Pressable onPress={e => {
              e.stopPropagation();
              handleDelete(item);
            }} style={styles.actionBtnDelete}>
                      <Text style={styles.actionBtnDeleteText}>XÓA</Text>
                    </Pressable>
                  </View> : null}
              </View>
            </Pressable>)}

        <View style={{
        height: 170
      }} />
      </ScrollView>
    </View>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  segmentedWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: HeronColors.border
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: Radius.full
  },
  segmentBtnActive: {
    backgroundColor: HeronColors.primary
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.surface,
    letterSpacing: 0.5
  },
  segmentTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: 10
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: HeronColors.border,
    ...HeronShadow.subtle
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: Radius.sm
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center'
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  timeText: {
    fontSize: 11,
    fontWeight: '800',
    color: HeronColors.brand,
    letterSpacing: 0.5
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HeronColors.primary,
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: HeronColors.granite
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: HeronColors.border,
    gap: 2,
    ...HeronShadow.subtle
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  historyDelete: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8'
  },
  historyMeta: {
    fontSize: 12,
    color: HeronColors.granite
  },
  historyNote: {
    marginTop: 4,
    fontSize: 13,
    fontStyle: 'italic',
    color: HeronColors.secondary
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  actionBtnEdit: {
    backgroundColor: HeronColors.cardAlt,
    borderWidth: 1,
    borderColor: HeronColors.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full
  },
  actionBtnEditText: {
    color: HeronColors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  actionBtnDelete: {
    backgroundColor: HeronColors.brandLight,
    borderWidth: 1,
    borderColor: '#FFD8CF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full
  },
  actionBtnDeleteText: {
    color: HeronColors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24
  },
  emptySquare: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: HeronColors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  emptySquareIcon: {
    fontSize: 22,
    color: HeronColors.surface
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: HeronColors.primary,
    letterSpacing: 0.8,
    marginBottom: 6
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: HeronColors.granite,
    textAlign: 'center'
  }
});