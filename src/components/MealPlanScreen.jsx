import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HeronColors, HeronShadow, Radius, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { AppleButton } from './ui/AppleButton';
import { confirmAction, showAlert } from '../utils/dialog';
import { matchesSearch } from '../utils/text';
import { parseIntInRange } from '../utils/quantity';
import { KCAL_MAX, goalProgress } from '../utils/nutrition';
import {
  MEAL_SLOTS, PLAN_DAYS_AHEAD, addDays, dateKey, dayCalories, dayKind, dayTitle, loggedDays,
  mealsForDay, shortDate, weekOf, weekdayLabel
} from '../utils/mealPlan';

const fmt = n => Math.round(n).toLocaleString('vi-VN');

/**
 * "Lịch ăn" tab: a journal of what was eaten on previous days and a plan for the next ones.
 * Dishes finished in Cooking Mode appear automatically on their day.
 */
export const MealPlanScreen = ({ onSelectRecipe }) => {
  const {
    mealPlan, cookHistory, getRecipeById, settings, addMealEntry, toggleMealEaten,
    deleteMealEntry, copyMealDay, addPlanToShopping
  } = useRecipes();
  const today = dateKey();
  const [selected, setSelected] = useState(today);
  const [addingSlot, setAddingSlot] = useState(null);
  const week = useMemo(() => weekOf(selected), [selected]);
  const kind = dayKind(selected, today);
  const goal = settings.calorieGoal || 2000;
  const meals = useMemo(() => mealsForDay(mealPlan, cookHistory, selected, getRecipeById), [mealPlan, cookHistory, selected, getRecipeById]);
  const kcal = dayCalories(meals);
  const weekKcal = useMemo(() => Object.fromEntries(week.map(day => {
    const dayMeals = mealsForDay(mealPlan, cookHistory, day, getRecipeById);
    const sums = dayCalories(dayMeals);
    return [day, { ...sums, count: dayMeals.length }];
  })), [week, mealPlan, cookHistory, getRecipeById]);
  // Last 7 days (today included): how many days were logged and the average intake on those days
  const recent = useMemo(() => {
    const from = addDays(today, -6);
    const days = loggedDays(mealPlan, cookHistory, from, today);
    const total = days.reduce((sum, day) => sum + dayCalories(mealsForDay(mealPlan, cookHistory, day, getRecipeById)).eaten, 0);
    return { days: days.length, avg: days.length ? total / days.length : 0 };
  }, [mealPlan, cookHistory, today, getRecipeById]);

  const maxDay = addDays(today, PLAN_DAYS_AHEAD);
  const canGoForward = week[6] < maxDay;
  const progress = goalProgress(kcal.eaten, goal);
  const plannedProgress = goalProgress(kcal.eaten + kcal.planned, goal);
  // kcal compared with the goal: eaten (past / today) or planned (future)
  const dayTotal = kind === 'future' ? kcal.planned : kcal.eaten;
  const over = dayTotal > goal;

  const handleShopping = async () => {
    const from = selected < today ? today : selected;
    const to = week[6];
    const result = await addPlanToShopping(from, to);
    if (!result) return;
    const { added, merged, dishes } = result;
    if (!dishes) {
      showAlert('Chưa có món nào để mua', `Từ ${dayTitle(from, today).toLowerCase()} đến hết ${shortDate(to)} chưa có món kế hoạch (từ công thức) nào.`);
      return;
    }
    showAlert('Đã cập nhật giỏ đi chợ 🛒', `${dishes} món trong kế hoạch • thêm ${added} • cộng dồn ${merged} nguyên liệu.`);
  };
  const handleCopyToTomorrow = async () => {
    const target = addDays(selected, 1);
    if (target > maxDay) return;
    const count = await copyMealDay(selected, target);
    if (count === null) return;
    if (count) showAlert('Đã sao chép', `${count} món được thêm vào ${dayTitle(target, today).toLowerCase()}.`);
    else showAlert('Không có gì để sao chép', 'Ngày này chưa có món nào được thêm thủ công.');
  };
  const handleDelete = meal => confirmAction({
    title: 'Xóa món này?',
    message: `"${meal.title}" — ${MEAL_SLOTS.find(s => s.id === meal.slot)?.label.toLowerCase()} ${dayTitle(meal.date, today).toLowerCase()}.`,
    confirmText: 'Xóa',
    destructive: true,
    onConfirm: () => deleteMealEntry(meal.id)
  });

  const renderMeal = meal => {
    const recipe = meal.recipeId ? getRecipeById(meal.recipeId) : null;
    return <Pressable key={meal.id} disabled={!recipe} onPress={() => onSelectRecipe(recipe)} style={styles.mealRow}>
        {!meal.fromHistory ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: meal.eaten }} accessibilityLabel={meal.eaten ? 'Đánh dấu chưa ăn' : 'Đánh dấu đã ăn'} hitSlop={8} onPress={() => toggleMealEaten(meal.id)} style={[styles.check, meal.eaten && styles.checkOn]}>
            {meal.eaten ? <Text style={styles.checkMark}>✓</Text> : null}
          </Pressable> : <View style={[styles.check, styles.checkOn, styles.checkCooked]}><Text style={styles.checkMark}>🍳</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.mealTitle, !meal.eaten && kind === 'past' && styles.mealSkipped]} numberOfLines={1}>{meal.title}</Text>
          <Text style={styles.mealMeta} numberOfLines={1}>
            {meal.calories ? `${fmt(meal.calories)} kcal` : 'Chưa có kcal'}
            {meal.fromHistory ? ' • nấu trong app' : meal.eaten ? ' • đã ăn' : kind === 'past' ? ' • bỏ qua' : ' • dự kiến'}
            {meal.recipeId ? ` • ${meal.servings} phần` : ''}
            {meal.recipeId && !recipe ? ' • món đã bị xóa' : ''}
          </Text>
        </View>
        {!meal.fromHistory ? <Pressable accessibilityLabel={`Xóa ${meal.title}`} hitSlop={8} onPress={() => handleDelete(meal)} style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.remove}>✕</Text>
          </Pressable> : null}
      </Pressable>;
  };

  return <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>NHẬT KÝ // KẾ HOẠCH BỮA ĂN</Text>
            <Text style={styles.title}>Lịch ăn</Text>
          </View>
          {selected !== today ? <Pressable accessibilityRole="button" onPress={() => setSelected(today)} style={({ pressed }) => [styles.todayBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.todayText}>Hôm nay</Text>
            </Pressable> : null}
        </View>

        {/* Week strip: ‹ range › */}
        <View style={styles.weekNav}>
          <Pressable accessibilityLabel="Tuần trước" hitSlop={8} onPress={() => setSelected(addDays(selected, -7))} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}><Text style={styles.navText}>‹</Text></Pressable>
          <Text style={styles.weekLabel}>{shortDate(week[0])} – {shortDate(week[6])}</Text>
          <Pressable accessibilityLabel="Tuần sau" disabled={!canGoForward} hitSlop={8} onPress={() => setSelected(addDays(selected, 7) > maxDay ? maxDay : addDays(selected, 7))} style={({ pressed }) => [styles.navBtn, !canGoForward && { opacity: 0.3 }, pressed && { opacity: 0.6 }]}><Text style={styles.navText}>›</Text></Pressable>
        </View>
        <View style={styles.weekRow}>
          {week.map(day => {
            const active = day === selected;
            const info = weekKcal[day];
            const isToday = day === today;
            const disabled = day > maxDay;
            return <Pressable key={day} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${dayTitle(day, today)}, ${info.count} món`} onPress={() => setSelected(day)} style={[styles.dayChip, isToday && !active && styles.dayChipToday, active && styles.dayChipActive, disabled && { opacity: 0.3 }]}>
                <Text style={[styles.dayName, active && styles.dayTextActive]}>{weekdayLabel(day)}</Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive, isToday && !active && { color: HeronColors.brand }]}>{Number(day.slice(8))}</Text>
                <View style={[styles.dayDot, info.count ? (day < today || info.eaten ? styles.dotEaten : styles.dotPlanned) : null, active && info.count ? { backgroundColor: '#FFFFFF' } : null]} />
              </Pressable>;
          })}
        </View>

        {/* Day summary */}
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryDay}>{dayTitle(selected, today)}</Text>
              <Text style={styles.summarySub}>{kind === 'past' ? 'Nhật ký đã ăn' : kind === 'today' ? 'Đã ăn & dự kiến' : 'Kế hoạch'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.kcalBig}>{fmt(kind === 'future' ? kcal.planned : kcal.eaten)}<Text style={styles.kcalGoal}> / {fmt(goal)} kcal</Text></Text>
              {kind === 'today' && kcal.planned ? <Text style={styles.summarySub}>+ {fmt(kcal.planned)} kcal dự kiến</Text> : null}
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fillPlanned, { width: `${Math.min(100, Math.round(plannedProgress * 100))}%` }]} />
            <View style={[styles.fill, progress > 1 && styles.fillOver, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
          </View>
          {kind === 'today' ? <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: HeronColors.emerald }]} /><Text style={styles.legendText}>Đã ăn</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFD2C2' }]} /><Text style={styles.legendText}>Dự kiến</Text></View>
            </View> : null}

          {/* Three numbers instead of a sentence */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{over ? (kind === 'future' ? 'Vượt kế hoạch' : 'Vượt mục tiêu') : (kind === 'future' ? 'Còn trống' : 'Còn lại')}</Text>
              <Text style={[styles.statValue, over && { color: HeronColors.brand }]}>{fmt(Math.abs(goal - dayTotal))}<Text style={styles.statUnit}> kcal</Text></Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>7 ngày qua</Text>
              <Text style={styles.statValue}>{recent.days}/7<Text style={styles.statUnit}> ngày</Text></Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Trung bình</Text>
              <Text style={styles.statValue}>{recent.days ? fmt(recent.avg) : '—'}<Text style={styles.statUnit}>{recent.days ? ' kcal' : ''}</Text></Text>
            </View>
          </View>
        </View>

        {/* Slots */}
        {MEAL_SLOTS.map(slot => {
          const slotMeals = meals.filter(meal => meal.slot === slot.id);
          const slotKcal = slotMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
          return <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotHead}>
                <View style={styles.slotIcon}><Text style={styles.slotIconText}>{slot.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotTitle}>{slot.label}</Text>
                  <Text style={styles.slotSub}>{slotMeals.length ? `${slotMeals.length} món${slotKcal ? ` • ${fmt(slotKcal)} kcal` : ''}` : 'Chưa có món'}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${kind === 'past' ? 'Ghi món đã ăn' : 'Thêm món'} vào ${slot.label.toLowerCase()}`} onPress={() => setAddingSlot(slot.id)} style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.addText}>＋ {kind === 'past' ? 'Ghi' : 'Thêm'}</Text>
                </Pressable>
              </View>
              {slotMeals.length ? <View style={styles.slotMeals}>{slotMeals.map(renderMeal)}</View> : null}
            </View>;
        })}

        {/* Two side-by-side action cards, same look as the meal cards */}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={handleShopping} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75 }]}>
            <View style={[styles.actionIcon, { backgroundColor: HeronColors.brandLight }]}><Text style={styles.actionIconText}>🛒</Text></View>
            <Text style={styles.actionTitle}>Mua nguyên liệu</Text>
            <Text style={styles.actionSub}>cho kế hoạch tuần này</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleCopyToTomorrow} style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.75 }]}>
            <View style={styles.actionIcon}><Text style={styles.actionIconText}>⧉</Text></View>
            <Text style={styles.actionTitle}>Sao chép thực đơn</Text>
            <Text style={styles.actionSub}>sang ngày hôm sau</Text>
          </Pressable>
        </View>
        <View style={{ height: 150 }} />
      </ScrollView>

      <AddMealModal
        visible={!!addingSlot}
        slot={addingSlot}
        date={selected}
        isPast={kind === 'past'}
        onClose={() => setAddingSlot(null)}
        onAdd={async input => {
          const entry = await addMealEntry({ ...input, date: selected, slot: addingSlot });
          if (entry === null) return showAlert('Chưa thêm được', 'Hãy chọn một công thức hoặc nhập tên món.');
          if (!entry) return; // refused by the server, already reported
          setAddingSlot(null);
        }}
      />
    </View>;
};

/** Picks a recipe (searchable) or a free-text dish with its own kcal. */
const AddMealModal = ({ visible, slot, date, isPast, onClose, onAdd }) => {
  const { recipes, favoriteIds } = useRecipes();
  const [mode, setMode] = useState('recipe');
  const [query, setQuery] = useState('');
  const [freeTitle, setFreeTitle] = useState('');
  const [freeKcal, setFreeKcal] = useState('');
  const [servings, setServings] = useState(1);
  const slotInfo = MEAL_SLOTS.find(s => s.id === slot);
  const list = useMemo(() => {
    const filtered = recipes.filter(r => matchesSearch([r.title, r.category, ...(r.tags || [])], query));
    // Favorites first, then lighter dishes
    return filtered.sort((a, b) => Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id)) || (a.calories || 9999) - (b.calories || 9999)).slice(0, 30);
  }, [recipes, favoriteIds, query]);
  const reset = () => {
    setMode('recipe');
    setQuery('');
    setFreeTitle('');
    setFreeKcal('');
    setServings(1);
  };
  const close = () => {
    reset();
    onClose();
  };
  const addFree = () => {
    const kcal = freeKcal.trim() ? parseIntInRange(freeKcal, 1, KCAL_MAX) : null;
    if (freeKcal.trim() && kcal === null) return showAlert('Calo chưa hợp lệ', `Nhập số nguyên từ 1 đến ${KCAL_MAX}.`);
    if (!freeTitle.trim()) return showAlert('Thiếu tên món', 'Nhập tên món bạn đã/ sẽ ăn.');
    onAdd({ title: freeTitle, calories: kcal, servings: 1 });
    reset();
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>{(slotInfo?.label || '').toUpperCase()} • {dayTitle(date).toUpperCase()}</Text>
            <Text style={styles.modalTitle}>{isPast ? 'Ghi món đã ăn' : 'Thêm vào kế hoạch'}</Text>
          </View>
          <Pressable accessibilityLabel="Đóng" onPress={close} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></Pressable>
        </View>
        <View style={styles.segment}>
          {[['recipe', 'Từ công thức'], ['free', 'Món tự nhập']].map(([id, label]) => <Pressable key={id} onPress={() => setMode(id)} style={[styles.segmentBtn, mode === id && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === id && styles.segmentTextActive]}>{label}</Text>
            </Pressable>)}
        </View>
        {mode === 'recipe' ? <>
            <View style={styles.modalRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tìm món..." placeholderTextColor={HeronColors.disable} value={query} onChangeText={setQuery} autoCorrect={false} />
              <View style={styles.stepper}>
                <Pressable accessibilityLabel="Giảm số phần" hitSlop={6} onPress={() => setServings(v => Math.max(1, v - 1))}><Text style={styles.stepperBtn}>−</Text></Pressable>
                <Text style={styles.stepperVal}>{servings} phần</Text>
                <Pressable accessibilityLabel="Tăng số phần" hitSlop={6} onPress={() => setServings(v => Math.min(20, v + 1))}><Text style={styles.stepperBtn}>+</Text></Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {list.map(recipe => <Pressable key={recipe.id} onPress={() => {
                onAdd({ recipe, servings });
                reset();
              }} style={styles.pickRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealTitle} numberOfLines={1}>{favoriteIds.includes(recipe.id) ? '❤️ ' : ''}{recipe.title}</Text>
                    <Text style={styles.mealMeta}>{recipe.category} • {recipe.calories ? `${recipe.calories} kcal/phần` : 'chưa có kcal'}</Text>
                  </View>
                  <Text style={styles.pickPlus}>＋</Text>
                </Pressable>)}
              {!list.length ? <Text style={styles.empty}>Không tìm thấy món phù hợp.</Text> : null}
              <Text style={styles.empty}>"{servings} phần" là số phần nấu — dùng khi đưa nguyên liệu vào giỏ đi chợ. Kcal được tính cho 1 người.</Text>
            </ScrollView>
          </> : <ScrollView contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Tên món</Text>
            <TextInput style={styles.input} placeholder="Ví dụ: Phở bò ngoài hàng" placeholderTextColor={HeronColors.disable} value={freeTitle} onChangeText={setFreeTitle} maxLength={80} />
            <Text style={styles.label}>Calo ước tính (kcal, tùy chọn)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="Ví dụ: 450" placeholderTextColor={HeronColors.disable} value={freeKcal} onChangeText={setFreeKcal} />
            <AppleButton title={isPast ? 'Ghi vào nhật ký' : 'Thêm vào kế hoạch'} onPress={addFree} style={{ marginTop: 20 }} />
          </ScrollView>}
      </KeyboardAvoidingView>
    </Modal>;
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: Spacing.md },
  tag: { fontSize: 10, fontWeight: '900', color: HeronColors.brand, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.8 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 22, fontWeight: '700', color: HeronColors.primary, lineHeight: 24 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: HeronColors.primary, fontVariant: ['tabular-nums'] },
  todayBtn: { height: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: HeronColors.brandLight, borderWidth: 1, borderColor: '#FFD8CF' },
  todayText: { fontSize: 13, fontWeight: '800', color: HeronColors.brand },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, gap: 2 },
  dayChipToday: { backgroundColor: HeronColors.brandLight, borderColor: '#FFD8CF' },
  dayChipActive: { backgroundColor: HeronColors.primary, borderColor: HeronColors.primary },
  dayName: { fontSize: 10, fontWeight: '800', color: HeronColors.surface },
  dayNum: { fontSize: 16, fontWeight: '900', color: HeronColors.primary },
  dayTextActive: { color: '#FFFFFF' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginTop: 2 },
  dotEaten: { backgroundColor: HeronColors.emerald },
  dotPlanned: { backgroundColor: HeronColors.brand },
  summary: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HeronColors.border, padding: 16, marginBottom: Spacing.md, ...HeronShadow.subtle },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  summaryDay: { fontSize: 18, fontWeight: '900', color: HeronColors.primary },
  summarySub: { fontSize: 12, color: HeronColors.granite, marginTop: 2 },
  kcalBig: { fontSize: 22, fontWeight: '900', color: HeronColors.brand },
  kcalGoal: { fontSize: 12, fontWeight: '700', color: HeronColors.granite },
  track: { height: 8, borderRadius: 4, backgroundColor: HeronColors.borderLight, marginTop: 12, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: HeronColors.emerald, borderRadius: 4 },
  fillOver: { backgroundColor: HeronColors.brand },
  fillPlanned: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFD2C2', borderRadius: 4 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600', color: HeronColors.granite },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: Radius.md, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.borderLight },
  statLabel: { fontSize: 11, fontWeight: '700', color: HeronColors.granite },
  statValue: { marginTop: 4, fontSize: 16, fontWeight: '900', color: HeronColors.primary, fontVariant: ['tabular-nums'] },
  statUnit: { fontSize: 11, fontWeight: '700', color: HeronColors.granite },
  slotCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HeronColors.border, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  slotIconText: { fontSize: 20 },
  slotTitle: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  slotSub: { marginTop: 1, fontSize: 12, fontWeight: '600', color: HeronColors.granite },
  addBtn: { height: 34, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: HeronColors.brandLight, borderWidth: 1, borderColor: '#FFD8CF' },
  slotMeals: { marginTop: 10 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: HeronColors.borderLight },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: HeronColors.disable, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: HeronColors.emerald, borderColor: HeronColors.emerald },
  checkCooked: { backgroundColor: HeronColors.emeraldLight, borderColor: HeronColors.emeraldLight },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  mealTitle: { fontSize: 14, fontWeight: '700', color: HeronColors.primary },
  mealSkipped: { color: HeronColors.disable, textDecorationLine: 'line-through' },
  mealMeta: { fontSize: 11, color: HeronColors.granite, marginTop: 2 },
  removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  remove: { fontSize: 12, fontWeight: '800', color: HeronColors.granite },
  addText: { fontSize: 13, fontWeight: '800', color: HeronColors.brand },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionCard: { flex: 1, padding: 14, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  actionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionIconText: { fontSize: 18, color: HeronColors.primary, fontWeight: '800' },
  actionTitle: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  actionSub: { marginTop: 2, fontSize: 12, lineHeight: 16, color: HeronColors.granite },
  modal: { flex: 1, backgroundColor: HeronColors.canvas },
  modalHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: Spacing.md },
  modalTitle: { fontSize: 22, fontWeight: '900', color: HeronColors.primary, marginTop: 2 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  segment: { flexDirection: 'row', marginHorizontal: Spacing.lg, padding: 4, borderRadius: Radius.full, backgroundColor: HeronColors.borderLight, marginBottom: 12 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, alignItems: 'center' },
  segmentActive: { backgroundColor: '#FFFFFF', ...HeronShadow.subtle },
  segmentText: { fontSize: 12, fontWeight: '800', color: HeronColors.granite },
  segmentTextActive: { color: HeronColors.primary },
  modalRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: HeronColors.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  stepperBtn: { fontSize: 18, fontWeight: '800', color: HeronColors.brand, paddingHorizontal: 2 },
  stepperVal: { fontSize: 12, fontWeight: '800', color: HeronColors.primary },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: HeronColors.borderLight },
  pickPlus: { fontSize: 20, color: HeronColors.brand, fontWeight: '700' },
  empty: { fontSize: 12, color: HeronColors.granite, marginTop: 14, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: '800', color: HeronColors.primary, marginTop: 14, marginBottom: 6 }
});
