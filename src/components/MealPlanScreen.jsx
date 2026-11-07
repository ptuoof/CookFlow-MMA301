import React, { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeronColors, HeronShadow, Radius, Spacing } from '../constants/theme';
import { useRecipes } from '../context/RecipeContext';
import { AppleButton } from './ui/AppleButton';
import { confirmAction, showAlert } from '../utils/dialog';
import { matchesSearch } from '../utils/text';
import { parseIntInRange } from '../utils/quantity';
import { KCAL_MAX, goalProgress } from '../utils/nutrition';
import {
  MEAL_SLOTS, PLAN_DAYS_AHEAD, PORTIONS_MAX, PORTIONS_MIN, PORTION_OPTIONS, addDays, clampPortions, dateKey,
  dayCalories, dayKind, dayTitle, formatPortions, loggedDays, mealKcal, mealsForDay, shortDate, weekOf, weekdayLabel
} from '../utils/mealPlan';

const fmt = n => Math.round(n).toLocaleString('vi-VN');

/**
 * "Lịch ăn" tab: a journal of what was eaten on previous days and a plan for the next ones.
 * Dishes finished in Cooking Mode appear automatically on their day.
 */
export const MealPlanScreen = ({ onSelectRecipe }) => {
  const {
    mealPlan, cookHistory, getRecipeById, settings, addMealEntry, toggleMealEaten, setMealPortions,
    deleteMealEntry, copyMealDay, addPlanToShopping, addToShoppingList
  } = useRecipes();
  const today = dateKey();
  const [selected, setSelected] = useState(today);
  const [addingSlot, setAddingSlot] = useState(null);
  // Dish whose "portions eaten" is being changed
  const [portionMeal, setPortionMeal] = useState(null);
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
    const portions = clampPortions(meal.portionsEaten ?? 1);
    return <Pressable key={meal.id} disabled={!recipe} onPress={() => onSelectRecipe(recipe)} style={styles.mealRow}>
        {!meal.fromHistory ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: meal.eaten }} accessibilityLabel={meal.eaten ? 'Đánh dấu chưa ăn' : 'Đánh dấu đã ăn'} hitSlop={8} onPress={() => toggleMealEaten(meal.id)} style={[styles.check, meal.eaten && styles.checkOn]}>
            {meal.eaten ? <Text style={styles.checkMark}>✓</Text> : null}
          </Pressable> : <View style={[styles.check, styles.checkOn, styles.checkCooked]}><Text style={styles.checkMark}>🍳</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.mealTitle, !meal.eaten && kind === 'past' && styles.mealSkipped]} numberOfLines={1}>{meal.title}</Text>
          <Text style={styles.mealMeta} numberOfLines={1}>
            {/* kcal = kcal per portion × portions eaten; "nấu N phần" is how much was cooked (for shopping) */}
            {meal.calories ? portions === 1 ? `${fmt(meal.calories)} kcal` : `${fmt(mealKcal(meal))} kcal (${formatPortions(portions)} × ${fmt(meal.calories)})` : 'Chưa có kcal'}
            {meal.fromHistory ? ' • nấu trong app' : meal.eaten ? ' • đã ăn' : kind === 'past' ? ' • bỏ qua' : ' • dự kiến'}
            {meal.recipeId && meal.servings > 1 ? ` • nấu ${meal.servings} phần` : ''}
            {meal.recipeId && !recipe ? ' • món đã bị xóa' : ''}
          </Text>
        </View>
        {!meal.fromHistory ? <Pressable accessibilityRole="button" accessibilityLabel={`Số phần bạn ăn: ${formatPortions(portions)}. Chạm để đổi`} hitSlop={6} onPress={() => setPortionMeal(meal)} style={({ pressed }) => [styles.portionPill, portions !== 1 && styles.portionPillOn, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.portionText, portions !== 1 && styles.portionTextOn]}>×{formatPortions(portions)}</Text>
          </Pressable> : null}
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
          const slotKcal = slotMeals.reduce((sum, meal) => sum + mealKcal(meal), 0);
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
        onAdd={async ({ shopping, ...input }) => {
          const entry = await addMealEntry({ ...input, date: selected, slot: addingSlot });
          if (entry === null) {
            showAlert('Chưa thêm được', 'Hãy chọn một công thức hoặc nhập tên món.');
            return false;
          }
          if (!entry) return false; // refused by the server, already reported
          setAddingSlot(null);
          // A free dish has no recipe: what the user listed to buy for it goes to the shopping list
          if (shopping?.length) {
            const slotLabel = MEAL_SLOTS.find(s => s.id === addingSlot)?.label || '';
            const result = await addToShoppingList(shopping, `${entry.title || input.title} (${slotLabel} ${shortDate(selected)})`.trim());
            if (result) showAlert('Đã thêm vào kế hoạch', `${result.added + result.merged} nguyên liệu đã vào danh sách đi chợ${result.merged ? ` (${result.merged} gộp với dòng có sẵn)` : ''}.`);
          }
          return true;
        }}
      />
      <PortionSheet
        meal={portionMeal}
        onClose={() => setPortionMeal(null)}
        onSave={portions => {
          setMealPortions(portionMeal.id, portions);
          setPortionMeal(null);
        }}
      />
    </View>;
};

/**
 * "Bạn ăn mấy phần?" for one dish: type any number (2,25), use ±¼ steps or a quick choice
 * (½, 1, 1½, 2, 3), with the kcal it gives. The cooked portions (for the shopping list) stay as they are.
 */
const parsePortions = text => {
  const n = Number(String(text).trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const PortionSheet = ({ meal, onClose, onSave }) => {
  const [value, setValue] = useState(1);
  // What is in the input while typing ("1," is fine until it is left)
  const [text, setText] = useState('1');
  const [forId, setForId] = useState(null);
  // Start from the dish's current portions each time a dish is opened
  if (meal && meal.id !== forId) {
    const start = clampPortions(meal.portionsEaten ?? 1);
    setForId(meal.id);
    setValue(start);
    setText(formatPortions(start));
  } else if (!meal && forId !== null) {
    setForId(null);
  }
  const choose = next => {
    const clean = clampPortions(next);
    setValue(clean);
    setText(formatPortions(clean));
  };
  const step = delta => choose(Math.min(PORTIONS_MAX, Math.max(PORTIONS_MIN, value + delta)));
  const handleType = input => {
    const cleaned = input.replace(/[^0-9.,]/g, '').slice(0, 5);
    setText(cleaned);
    const n = parsePortions(cleaned);
    if (n !== null) setValue(clampPortions(n));
  };
  const typed = parsePortions(text);
  // Typed value outside the range or between quarters: say what will be saved
  const adjusted = typed !== null && typed !== value;
  const kcal = meal?.calories ? meal.calories * value : null;
  const save = () => {
    if (typed === null) {
      showAlert('Số phần chưa hợp lệ', `Nhập số từ ${formatPortions(PORTIONS_MIN)} đến ${formatPortions(PORTIONS_MAX)}, ví dụ 1,5.`);
      return;
    }
    onSave(value);
  };
  return <Modal visible={!!meal} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Đóng" style={StyleSheet.absoluteFill} onPress={onClose} />
        {meal ? <View style={styles.sheetCard}>
            <Text style={styles.tag}>🍽️ PHẦN ĂN</Text>
            <Text style={styles.sheetTitle} numberOfLines={2}>Bạn ăn mấy phần?</Text>
            <Text style={styles.sheetSub} numberOfLines={2}>{meal.title}{meal.calories ? ` • ${fmt(meal.calories)} kcal/phần` : ''}</Text>

            <View style={styles.sheetStepper}>
              <Pressable accessibilityLabel="Bớt ¼ phần" hitSlop={6} disabled={value <= PORTIONS_MIN} onPress={() => step(-0.25)} style={[styles.sheetStepBtn, value <= PORTIONS_MIN && { opacity: 0.35 }]}><Text style={styles.sheetStepText}>−</Text></Pressable>
              <View style={styles.sheetInputBox}>
                <TextInput
                  accessibilityLabel="Nhập số phần bạn ăn"
                  style={styles.sheetInput}
                  value={text}
                  onChangeText={handleType}
                  onBlur={() => setText(formatPortions(value))}
                  onSubmitEditing={save}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  selectTextOnFocus
                  maxLength={5}
                />
                <Text style={styles.sheetUnit}>phần • chạm để nhập</Text>
              </View>
              <Pressable accessibilityLabel="Thêm ¼ phần" hitSlop={6} disabled={value >= PORTIONS_MAX} onPress={() => step(0.25)} style={[styles.sheetStepBtn, value >= PORTIONS_MAX && { opacity: 0.35 }]}><Text style={styles.sheetStepText}>+</Text></Pressable>
            </View>
            {adjusted ? <Text style={styles.sheetAdjust}>Sẽ lưu {formatPortions(value)} phần (làm tròn ¼, từ {formatPortions(PORTIONS_MIN)} đến {formatPortions(PORTIONS_MAX)})</Text> : null}
            <View style={styles.sheetChips}>
              {PORTION_OPTIONS.map(option => {
                const active = value === option;
                return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => choose(option)} style={[styles.sheetChip, active && styles.sheetChipOn]}>
                    <Text style={[styles.sheetChipText, active && styles.sheetChipTextOn]}>×{formatPortions(option)}</Text>
                  </Pressable>;
              })}
            </View>

            <View style={styles.sheetTotal}>
              <Text style={styles.sheetTotalLabel}>Calo tính vào ngày</Text>
              <Text style={styles.sheetTotalValue}>{kcal ? `${fmt(kcal)} kcal` : 'Chưa có kcal'}</Text>
            </View>
            {meal.recipeId && meal.servings > 1 ? <Text style={styles.sheetNote}>Số phần nấu ({meal.servings} phần) vẫn giữ nguyên cho giỏ đi chợ.</Text> : null}

            <View style={styles.sheetActions}>
              <AppleButton title="Hủy" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <AppleButton title="Lưu" onPress={save} style={{ flex: 1 }} />
            </View>
          </View> : null}
      </KeyboardAvoidingView>
    </Modal>;
};

const KCAL_PRESETS = [200, 350, 500, 700];
const AMOUNT_PATTERN = /^\d+([.,]\d+)?(\/\d+)?$/;
let itemSeq = 0;
const emptyItem = () => {
  itemSeq += 1;
  return { key: `item_${itemSeq}`, name: '', amount: '', unit: '' };
};

/**
 * Picks a recipe (searchable) or a free-text dish with its own kcal.
 * A free dish has no recipe, so no ingredient list: when it is cooked at home, "Cần mua cho món này"
 * lets the user list what to buy, which goes straight to the shopping list together with the plan.
 * `onAdd(input)` resolves to true when the dish was added.
 */
const AddMealModal = ({ visible, slot, date, isPast, onClose, onAdd }) => {
  const { recipes, favoriteIds } = useRecipes();
  const insets = useSafeAreaInsets();
  // Android draws this sheet edge-to-edge (no grey status / navigation bands): pad it ourselves.
  // iOS shows a page sheet that already sits below the status bar.
  const padTop = Platform.OS === 'android' ? insets.top : 0;
  const padBottom = Platform.OS === 'android' ? insets.bottom : 0;
  const [mode, setMode] = useState('recipe');
  const [query, setQuery] = useState('');
  const [freeTitle, setFreeTitle] = useState('');
  const [freeKcal, setFreeKcal] = useState('');
  const [servings, setServings] = useState(1);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
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
    setItems([]);
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = async input => {
    if (saving) return;
    setSaving(true);
    const added = await onAdd(input);
    setSaving(false);
    if (added) reset();
  };
  const updateItem = (key, patch) => setItems(list => list.map(item => item.key === key ? { ...item, ...patch } : item));
  const addFree = () => {
    const kcal = freeKcal.trim() ? parseIntInRange(freeKcal, 1, KCAL_MAX) : null;
    if (!freeTitle.trim()) return showAlert('Thiếu tên món', 'Nhập tên món bạn đã / sẽ ăn.');
    if (freeKcal.trim() && kcal === null) return showAlert('Calo chưa hợp lệ', `Nhập số nguyên từ 1 đến ${KCAL_MAX}.`);
    const toBuy = isPast ? [] : items.filter(item => item.name.trim());
    const badAmount = toBuy.find(item => item.amount.trim() && !AMOUNT_PATTERN.test(item.amount.trim()));
    if (badAmount) return showAlert('Số lượng chưa hợp lệ', `"${badAmount.name.trim()}": nhập số như 2, 0,5 hoặc 1/2 — hoặc để trống.`);
    return submit({
      title: freeTitle,
      calories: kcal,
      servings: 1,
      shopping: toBuy.map(item => ({ name: item.name.trim(), amount: item.amount.trim().replace(',', '.'), unit: item.unit.trim() }))
    });
  };
  const buyCount = items.filter(item => item.name.trim()).length;

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView style={[styles.modal, { paddingTop: padTop }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tag}>{slotInfo?.icon} {(slotInfo?.label || '').toUpperCase()} • {dayTitle(date).toUpperCase()}</Text>
            <Text style={styles.modalTitle}>{isPast ? 'Ghi món đã ăn' : 'Thêm vào kế hoạch'}</Text>
          </View>
          <Pressable accessibilityLabel="Đóng" hitSlop={6} onPress={close} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}><Text style={styles.closeText}>✕</Text></Pressable>
        </View>

        <View style={styles.segment}>
          {[['recipe', '📖  Từ công thức'], ['free', '✍️  Món tự nhập']].map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: mode === id }} onPress={() => setMode(id)} style={[styles.segmentBtn, mode === id && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === id && styles.segmentTextActive]}>{label}</Text>
            </Pressable>)}
        </View>

        {mode === 'recipe' ? <>
            <View style={styles.modalRow}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput style={styles.searchInput} placeholder="Tìm món..." placeholderTextColor={HeronColors.disable} value={query} onChangeText={setQuery} autoCorrect={false} />
              </View>
              <View style={styles.stepper}>
                <Pressable accessibilityLabel="Giảm số phần" hitSlop={6} onPress={() => setServings(v => Math.max(1, v - 1))} style={styles.stepperBtnWrap}><Text style={styles.stepperBtn}>−</Text></Pressable>
                <Text style={styles.stepperVal}>{servings} phần</Text>
                <Pressable accessibilityLabel="Tăng số phần" hitSlop={6} onPress={() => setServings(v => Math.min(20, v + 1))} style={styles.stepperBtnWrap}><Text style={styles.stepperBtn}>+</Text></Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 + padBottom }} keyboardShouldPersistTaps="handled">
              {list.map(recipe => <Pressable key={recipe.id} disabled={saving} onPress={() => submit({ recipe, servings })} style={({ pressed }) => [styles.pickCard, pressed && { opacity: 0.75 }]}>
                  <Image source={{ uri: recipe.imageUrl }} style={styles.pickThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickTitle} numberOfLines={1}>{favoriteIds.includes(recipe.id) ? '❤️ ' : ''}{recipe.title}</Text>
                    <Text style={styles.mealMeta} numberOfLines={1}>{recipe.category} • {recipe.calories ? `${recipe.calories} kcal/phần` : 'chưa có kcal'}</Text>
                  </View>
                  <View style={styles.pickPlus}><Text style={styles.pickPlusText}>＋</Text></View>
                </Pressable>)}
              {!list.length ? <Text style={styles.empty}>Không tìm thấy món phù hợp.</Text> : null}
              <Text style={styles.empty}>{`"${servings} phần" là số phần nấu (cho giỏ đi chợ). Calo tính theo số phần bạn ăn — mặc định 1, chạm “×1” trong Lịch ăn để đổi.`}</Text>
            </ScrollView>
          </> : <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <View style={styles.formCard}>
                <Text style={styles.label}>Tên món</Text>
                <TextInput style={styles.input} placeholder="Ví dụ: Phở bò ngoài hàng" placeholderTextColor={HeronColors.disable} value={freeTitle} onChangeText={setFreeTitle} maxLength={80} />
                <Text style={styles.label}>Calo ước tính <Text style={styles.labelHint}>(kcal / phần, tùy chọn)</Text></Text>
                <TextInput style={styles.input} keyboardType="numeric" placeholder="Ví dụ: 450" placeholderTextColor={HeronColors.disable} value={freeKcal} onChangeText={setFreeKcal} />
                <View style={styles.presetRow}>
                  {KCAL_PRESETS.map(value => {
                    const active = freeKcal.trim() === String(value);
                    return <Pressable key={value} onPress={() => setFreeKcal(active ? '' : String(value))} style={[styles.preset, active && styles.presetActive]}>
                        <Text style={[styles.presetText, active && styles.presetTextActive]}>{value}</Text>
                      </Pressable>;
                  })}
                </View>
              </View>

              {/* A free dish has no recipe: what to buy for it is listed here and goes to the shopping list */}
              {!isPast ? <View style={styles.formCard}>
                  <Text style={styles.cardTitle}>🛒  Cần mua cho món này <Text style={styles.labelHint}>(tùy chọn)</Text></Text>
                  <Text style={styles.cardHint}>Món tự nhập không có công thức nên không có sẵn nguyên liệu. Nếu bạn tự nấu, ghi thứ cần mua — chúng được thêm thẳng vào giỏ đi chợ.</Text>
                  {items.map(item => <View key={item.key} style={styles.itemRow}>
                      <TextInput style={[styles.input, styles.itemName]} placeholder="Nguyên liệu" placeholderTextColor={HeronColors.disable} value={item.name} onChangeText={name => updateItem(item.key, { name })} />
                      <TextInput style={[styles.input, styles.itemAmount]} placeholder="SL" placeholderTextColor={HeronColors.disable} keyboardType="decimal-pad" value={item.amount} onChangeText={amount => updateItem(item.key, { amount })} />
                      <TextInput style={[styles.input, styles.itemUnit]} placeholder="đơn vị" placeholderTextColor={HeronColors.disable} autoCapitalize="none" value={item.unit} onChangeText={unit => updateItem(item.key, { unit })} />
                      <Pressable accessibilityLabel="Bỏ nguyên liệu này" hitSlop={6} onPress={() => setItems(list => list.filter(row => row.key !== item.key))} style={styles.itemRemove}><Text style={styles.closeText}>✕</Text></Pressable>
                    </View>)}
                  <Pressable accessibilityRole="button" onPress={() => setItems(list => [...list, emptyItem()])} style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.addItemText}>＋ Thêm nguyên liệu</Text>
                  </Pressable>
                </View> : null}
            </ScrollView>
            <View style={[styles.bottomBar, { paddingBottom: 12 + padBottom }]}>
              <AppleButton
                title={saving ? 'Đang lưu…' : isPast ? 'Ghi vào nhật ký' : buyCount ? `Thêm vào kế hoạch & giỏ (${buyCount})` : 'Thêm vào kế hoạch'}
                onPress={addFree}
                disabled={saving}
                style={{ width: '100%' }}
              />
            </View>
          </>}
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
  portionPill: { minWidth: 44, height: 30, paddingHorizontal: 8, marginRight: 6, borderRadius: Radius.full, backgroundColor: HeronColors.cardAlt, borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  portionPillOn: { backgroundColor: HeronColors.brandLight, borderColor: '#FFD8CF' },
  portionText: { fontSize: 12, fontWeight: '800', color: HeronColors.secondary, fontVariant: ['tabular-nums'] },
  portionTextOn: { color: HeronColors.brandHover },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(17,17,17,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheetCard: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, ...HeronShadow.card },
  sheetTitle: { marginTop: 4, fontSize: 21, fontWeight: '900', color: HeronColors.primary, letterSpacing: -0.4 },
  sheetSub: { marginTop: 3, fontSize: 13, color: HeronColors.granite },
  sheetStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 18 },
  sheetStepBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center' },
  sheetStepText: { fontSize: 24, fontWeight: '800', color: HeronColors.brand, lineHeight: 28 },
  sheetInputBox: { alignItems: 'center', minWidth: 120 },
  sheetInput: { minWidth: 110, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: HeronColors.border, backgroundColor: HeronColors.cardAlt, textAlign: 'center', fontSize: 34, fontWeight: '900', color: HeronColors.primary, fontVariant: ['tabular-nums'] },
  sheetAdjust: { marginTop: 8, textAlign: 'center', fontSize: 12, fontWeight: '700', color: HeronColors.amber },
  sheetUnit: { fontSize: 11, fontWeight: '700', color: HeronColors.granite, marginTop: 4 },
  sheetChips: { flexDirection: 'row', gap: 6, marginTop: 16 },
  sheetChip: { flex: 1, height: 36, borderRadius: Radius.full, borderWidth: 1, borderColor: HeronColors.border, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  sheetChipOn: { backgroundColor: HeronColors.primary, borderColor: HeronColors.primary },
  sheetChipText: { fontSize: 13, fontWeight: '800', color: HeronColors.secondary },
  sheetChipTextOn: { color: '#FFFFFF' },
  sheetTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: HeronColors.brandLight },
  sheetTotalLabel: { fontSize: 13, fontWeight: '700', color: HeronColors.secondary },
  sheetTotalValue: { fontSize: 17, fontWeight: '900', color: HeronColors.brandHover, fontVariant: ['tabular-nums'] },
  sheetNote: { marginTop: 8, fontSize: 12, lineHeight: 17, color: HeronColors.granite },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
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
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 18, paddingBottom: Spacing.md },
  modalTitle: { fontSize: 24, fontWeight: '900', color: HeronColors.primary, marginTop: 4, letterSpacing: -0.5 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  segment: { flexDirection: 'row', marginHorizontal: Spacing.lg, padding: 4, borderRadius: Radius.full, backgroundColor: HeronColors.borderLight, marginBottom: 14 },
  segmentBtn: { flex: 1, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: '#FFFFFF', ...HeronShadow.subtle },
  segmentText: { fontSize: 13, fontWeight: '800', color: HeronColors.granite },
  segmentTextActive: { color: HeronColors.primary },
  modalRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: 12 },
  searchBox: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  searchIcon: { fontSize: 18, color: HeronColors.granite },
  searchInput: { flex: 1, fontSize: 14, color: HeronColors.primary, paddingVertical: 0 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 14, color: HeronColors.primary },
  stepper: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, borderRadius: Radius.full, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  stepperBtnWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center' },
  stepperBtn: { fontSize: 17, fontWeight: '800', color: HeronColors.brand, lineHeight: 20 },
  stepperVal: { minWidth: 48, textAlign: 'center', fontSize: 13, fontWeight: '800', color: HeronColors.primary },
  pickCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: Radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: HeronColors.border },
  pickThumb: { width: 54, height: 54, borderRadius: 12, backgroundColor: HeronColors.borderLight },
  pickTitle: { fontSize: 14, fontWeight: '800', color: HeronColors.primary },
  pickPlus: { width: 34, height: 34, borderRadius: 17, backgroundColor: HeronColors.brandLight, alignItems: 'center', justifyContent: 'center' },
  pickPlusText: { fontSize: 18, color: HeronColors.brand, fontWeight: '800' },
  empty: { fontSize: 12, color: HeronColors.granite, marginTop: 12, lineHeight: 17, textAlign: 'center' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: HeronColors.border, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: HeronColors.primary },
  cardHint: { marginTop: 4, marginBottom: 6, fontSize: 12, lineHeight: 17, color: HeronColors.granite },
  label: { fontSize: 13, fontWeight: '800', color: HeronColors.primary, marginTop: 12, marginBottom: 6 },
  labelHint: { fontSize: 12, fontWeight: '600', color: HeronColors.granite },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  preset: { flex: 1, height: 36, borderRadius: Radius.full, borderWidth: 1, borderColor: HeronColors.border, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  presetActive: { backgroundColor: HeronColors.brandLight, borderColor: HeronColors.brand },
  presetText: { fontSize: 13, fontWeight: '700', color: HeronColors.granite },
  presetTextActive: { color: HeronColors.brand },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  itemName: { flex: 1 },
  itemAmount: { width: 56, textAlign: 'center', paddingHorizontal: 6 },
  itemUnit: { width: 72, paddingHorizontal: 8 },
  itemRemove: { width: 32, height: 32, borderRadius: 16, backgroundColor: HeronColors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  addItemBtn: { marginTop: 10, height: 42, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: HeronColors.brand, alignItems: 'center', justifyContent: 'center' },
  addItemText: { fontSize: 13, fontWeight: '800', color: HeronColors.brand },
  bottomBar: { paddingHorizontal: Spacing.lg, paddingTop: 12, backgroundColor: HeronColors.canvas, borderTopWidth: 1, borderTopColor: HeronColors.borderLight }
});
