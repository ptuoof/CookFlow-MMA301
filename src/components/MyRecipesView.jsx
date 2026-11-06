import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { confirmAction } from '../utils/dialog';
import { totalMinutes } from '../utils/recipeModel';
import { formatCookedDay } from '../utils/history';
import { HeronColors, Radius, HeronShadow, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';

const TABS = [
  { id: 'favorites', icon: '❤️', label: 'Đã lưu' },
  { id: 'custom', icon: '✍️', label: 'Tự tạo' },
  { id: 'history', icon: '🍳', label: 'Đã nấu' }
];
const EMPTY = {
  favorites: { icon: '❤️', tint: HeronColors.brandLight, title: 'Chưa lưu món nào', text: 'Thả tim các món bạn thích ở trang Khám phá, chúng sẽ nằm gọn ở đây.' },
  custom: { icon: '✍️', tint: HeronColors.emeraldLight, title: 'Chưa có công thức tự tạo', text: 'Bấm nút “+” ở giữa thanh điều hướng để viết công thức của riêng bạn.' },
  history: { icon: '🍳', tint: HeronColors.amberLight, title: 'Chưa nấu món nào', text: 'Hoàn thành một món trong Chế độ nấu để lưu lịch sử, đánh giá và ghi chú cho lần sau.' }
};

/** "Món của tôi": saved recipes, own recipes (edit / delete) and the cooking history. */
export const MyRecipesView = ({ onSelectRecipe, onEditRecipe }) => {
  const { recipes, favoriteIds, deleteRecipe, timers, cookHistory, deleteHistoryEntry, getRecipeById } = useRecipes();
  const [activeTab, setActiveTab] = useState('favorites');
  const favoriteRecipes = recipes.filter(r => favoriteIds.includes(r.id));
  // Own recipes only (shared recipes of other users are personal too, but not "mine")
  const customRecipes = recipes.filter(r => r.isCustom && r.isOwner);
  const counts = { favorites: favoriteRecipes.length, custom: customRecipes.length, history: cookHistory.length };

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

  const renderRecipe = item => {
    const minutes = totalMinutes(item);
    const isMine = activeTab === 'custom';
    return <Pressable key={item.id} onPress={() => onSelectRecipe(item)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardBody}>
          <View style={styles.chipRow}>
            <View style={styles.categoryChip}><Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text></View>
            {isMine ? <View style={[styles.visibilityChip, item.isPublic && styles.visibilityPublic]}>
                <Text style={[styles.visibilityText, item.isPublic && styles.visibilityTextPublic]}>{item.isPublic ? '🌐 Công khai' : '🔒 Riêng tư'}</Text>
              </View> : null}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.description ? <Text style={styles.cardDesc} numberOfLines={isMine ? 1 : 2}>{item.description}</Text> : null}
          <View style={styles.metaRow}>
            {minutes ? <Text style={styles.metaText}>⏱ {minutes} phút</Text> : null}
            {item.calories ? <Text style={styles.metaText}>🔥 {item.calories} kcal</Text> : null}
            <Text style={styles.metaText}>👥 {item.servings}</Text>
          </View>
          {isMine ? <View style={styles.actionRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Sửa ${item.title}`} hitSlop={4} onPress={e => { e.stopPropagation(); onEditRecipe(item); }} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.actionText}>✎ Sửa</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${item.title}`} hitSlop={4} onPress={e => { e.stopPropagation(); handleDelete(item); }} style={({ pressed }) => [styles.actionBtn, styles.actionDanger, pressed && { opacity: 0.7 }]}>
                <Text style={[styles.actionText, styles.actionDangerText]}>Xóa</Text>
              </Pressable>
            </View> : null}
        </View>
      </Pressable>;
  };

  const renderHistoryEntry = entry => {
    const recipe = getRecipeById(entry.recipeId);
    return <Pressable key={entry.id} disabled={!recipe} onPress={() => onSelectRecipe(recipe)} onLongPress={() => handleDeleteHistory(entry)} style={({ pressed }) => [styles.historyCard, pressed && styles.cardPressed]}>
        {recipe ? <Image source={{ uri: recipe.imageUrl }} style={styles.historyImage} /> : <View style={[styles.historyImage, styles.historyImageGone]}><Text style={{ fontSize: 22 }}>🍽️</Text></View>}
        <View style={{ flex: 1 }}>
          <View style={styles.historyTop}>
            <Text style={[styles.cardTitle, { flex: 1, marginTop: 0 }]} numberOfLines={1}>{entry.recipeTitle}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Xóa lần nấu này" hitSlop={8} onPress={() => handleDeleteHistory(entry)} style={({ pressed }) => [styles.historyDelete, pressed && { opacity: 0.6 }]}>
              <Text style={styles.historyDeleteText}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>📅 {formatCookedDay(entry.finishedAt)}</Text>
            <Text style={styles.metaText}>👥 {entry.servings} người</Text>
          </View>
          {entry.rating ? <Text style={styles.stars}>{'★'.repeat(entry.rating)}<Text style={styles.starsOff}>{'★'.repeat(5 - entry.rating)}</Text></Text> : null}
          {!recipe ? <Text style={styles.goneText}>Công thức này đã bị xóa</Text> : null}
          {entry.note ? <View style={styles.noteBox}><Text style={styles.noteText} numberOfLines={3}>“{entry.note}”</Text></View> : null}
        </View>
      </Pressable>;
  };

  const empty = EMPTY[activeTab];
  const list = activeTab === 'favorites' ? favoriteRecipes : activeTab === 'custom' ? customRecipes : cookHistory;

  return <View style={styles.container}>
      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setActiveTab(tab.id)} style={[styles.segmentBtn, active && styles.segmentActive]}>
                <Text style={styles.segmentIcon}>{tab.icon}</Text>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab.label}</Text>
                <View style={[styles.countPill, active && styles.countPillActive]}>
                  <Text style={[styles.countText, active && styles.countTextActive]}>{counts[tab.id]}</Text>
                </View>
              </Pressable>;
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {list.length === 0 ? <View style={styles.emptyBox}>
            <View style={[styles.emptyIcon, { backgroundColor: empty.tint }]}><Text style={{ fontSize: 30 }}>{empty.icon}</Text></View>
            <Text style={styles.emptyTitle}>{empty.title}</Text>
            <Text style={styles.emptyText}>{empty.text}</Text>
          </View> : <>
            <Text style={styles.listHint}>
              {activeTab === 'history' ? `${list.length} lần nấu • giữ để xóa nhanh` : activeTab === 'custom' ? `${list.length} công thức của bạn` : `${list.length} món đã lưu`}
            </Text>
            {activeTab === 'history' ? cookHistory.map(renderHistoryEntry) : list.map(renderRecipe)}
          </>}
        <View style={{ height: 170 }} />
      </ScrollView>
    </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentWrap: { paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: 12 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.full, backgroundColor: HeronColors.borderLight },
  segmentBtn: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: Radius.full },
  segmentActive: { backgroundColor: '#FFFFFF', ...HeronShadow.subtle },
  segmentIcon: { fontSize: 13 },
  segmentText: { fontSize: 13, fontWeight: '800', color: HeronColors.granite },
  segmentTextActive: { color: HeronColors.primary },
  countPill: { minWidth: 20, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  countPillActive: { backgroundColor: HeronColors.brand },
  countText: { fontSize: 10, fontWeight: '900', color: HeronColors.granite },
  countTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: Spacing.lg, gap: 10 },
  listHint: { fontSize: 12, fontWeight: '700', color: HeronColors.granite, marginLeft: 4 },
  card: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, ...HeronShadow.subtle },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardImage: { width: 96, height: 96, borderRadius: 14, backgroundColor: HeronColors.borderLight, alignSelf: 'center' },
  cardBody: { flex: 1, justifyContent: 'center' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryChip: { maxWidth: 140, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: HeronColors.brandLight },
  categoryText: { fontSize: 10, fontWeight: '800', color: HeronColors.brandHover },
  visibilityChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.borderLight },
  visibilityPublic: { backgroundColor: HeronColors.emeraldLight, borderColor: HeronColors.emeraldLight },
  visibilityText: { fontSize: 10, fontWeight: '800', color: HeronColors.granite },
  visibilityTextPublic: { color: HeronColors.emerald },
  cardTitle: { marginTop: 5, fontSize: 15, fontWeight: '800', color: HeronColors.primary, letterSpacing: -0.2 },
  cardDesc: { marginTop: 2, fontSize: 12, lineHeight: 16, color: HeronColors.granite },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2, marginTop: 6 },
  metaText: { fontSize: 11, fontWeight: '700', color: HeronColors.secondary },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { height: 30, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.border },
  actionText: { fontSize: 12, fontWeight: '800', color: HeronColors.primary },
  actionDanger: { backgroundColor: '#FFF1F0', borderColor: '#FFD5D1' },
  actionDangerText: { color: '#D92D20' },
  historyCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, ...HeronShadow.subtle },
  historyImage: { width: 64, height: 64, borderRadius: 14, backgroundColor: HeronColors.borderLight },
  historyImageGone: { alignItems: 'center', justifyContent: 'center' },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDelete: { width: 26, height: 26, borderRadius: 13, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  historyDeleteText: { fontSize: 11, fontWeight: '900', color: HeronColors.granite },
  stars: { marginTop: 4, fontSize: 13, letterSpacing: 1, color: '#F59F00' },
  starsOff: { color: HeronColors.border },
  goneText: { marginTop: 4, fontSize: 11, fontWeight: '700', color: HeronColors.disable },
  noteBox: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: HeronColors.cardAlt, borderLeftWidth: 3, borderLeftColor: HeronColors.amber },
  noteText: { fontSize: 12, lineHeight: 17, fontStyle: 'italic', color: HeronColors.secondary },
  emptyBox: { alignItems: 'center', marginTop: 40, paddingVertical: 32, paddingHorizontal: 24, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: HeronColors.primary, marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 20, color: HeronColors.granite, textAlign: 'center' }
});
