import test from 'node:test';
import assert from 'node:assert/strict';
// Business-rule tests for the pure helpers (no React Native runtime needed).
const R = new URL('../src', import.meta.url).href;
const { scaleAmount, addAmounts, parseAmount, parseIntInRange } = await import(`${R}/utils/quantity.js`);
const { normalizeVi, matchesSearch, containsPhrase } = await import(`${R}/utils/text.js`);
const { getGroceryAisle } = await import(`${R}/utils/groceryAisles.js`);
const { normalizeRecipe, recipeSignature, normalizeCategory, relocateTimerStep, getSessionStepIndex } = await import(`${R}/utils/recipeModel.js`);
const { normalizeUnit, addQuantities } = await import(`${R}/utils/units.js`);
const { mergeIntoShoppingList } = await import(`${R}/utils/shopping.js`);
const { ingredientsOnHand, pantryItemsUsedBy, isStapleIngredient } = await import(`${R}/utils/pantry.js`);
const { SERVINGS_MAX, TIMER_SECONDS_MAX } = await import(`${R}/constants/limits.js`);
const { encodeRecipeForQr, decodeRecipeFromQr } = await import(`${R}/services/recipeQr.js`);
const { INITIAL_RECIPES } = await import(`${R}/data/mockRecipes.js`);

test('scaleAmount', () => {
  assert.equal(scaleAmount('150', 2), '300');
  assert.equal(scaleAmount('1/2', 2), '1');
  assert.equal(scaleAmount('1 1/2', 2), '3');
  assert.equal(scaleAmount('2,5', 2), '5');
  assert.equal(scaleAmount('3', 0.5), '1,5');
  assert.equal(scaleAmount('Vừa đủ', 3), 'Vừa đủ');
  assert.equal(scaleAmount(6, 0.5), '3');
  assert.equal(scaleAmount('1/4', 0.25), '0,1');
  assert.equal(scaleAmount('150', 1), '150');
});
test('addAmounts', () => {
  assert.equal(addAmounts('150', '90'), '240');
  assert.equal(addAmounts('0,5', '1/2'), '1');
  assert.equal(addAmounts('Vừa đủ', '2'), null);
  assert.equal(parseAmount(''), null);
});
test('parseIntInRange', () => {
  assert.equal(parseIntInRange('0', 0, 10), 0);
  assert.equal(parseIntInRange('-1', 0, 10), null);
  assert.equal(parseIntInRange('1.5', 0, 10), null);
  assert.equal(parseIntInRange('abc', 0, 10), null);
});
test('Vietnamese search', () => {
  assert.equal(normalizeVi('Đường Phèn'), 'duong phen');
  assert.ok(matchesSearch(['Bò Lúc Lắc Sốt Tiêu'], 'bo luc'));
  assert.ok(matchesSearch(['Trứng gà ta'], 'TRUNG'));
  assert.ok(!matchesSearch(['Nước tương'], 'oc'));
  assert.ok(!containsPhrase('nuoc mam', 'oc'));
});
test('grocery aisles', () => {
  const cases = { 'Nước tương ngon': 'pantry', 'Nước mắm': 'pantry', 'Dầu ăn': 'pantry', 'Đường': 'pantry', 'Trứng gà ta': 'dairy',
    'Sữa tươi không đường': 'dairy', 'Quả bơ sáp chín': 'produce', 'Thịt bò phi lê': 'meat', 'Ốc hương': 'seafood', 'Tôm sú': 'seafood',
    'Cà rốt': 'produce', 'Bột mì': 'bakery', 'Bơ lạt': 'dairy', 'Đậu hũ': 'produce' };
  for (const [name, aisle] of Object.entries(cases)) assert.equal(getGroceryAisle(name).id, aisle, name);
});
test('normalizeRecipe', () => {
  const r = normalizeRecipe({ title: ' A ', ingredients: [{ id: 'i1', name: 'x' }, { id: 'i1', name: 'y' }, { name: '' }], steps: [{ title: '', instruction: '' }, { instruction: 'do', timerSeconds: 'abc' }], servings: 0 });
  assert.equal(r.title, 'A');
  assert.equal(r.ingredients.length, 2);
  assert.notEqual(r.ingredients[0].id, r.ingredients[1].id);
  assert.equal(r.steps.length, 1);
  assert.equal(r.steps[0].stepNumber, 1);
  assert.equal(r.steps[0].timerSeconds, null);
  assert.equal(r.servings, 1);
  assert.equal(normalizeRecipe({ title: '' }), null);
  INITIAL_RECIPES.forEach(x => assert.ok(normalizeRecipe(x)));
});
test('step ids are unique and survive edits', () => {
  const r = normalizeRecipe({ title: 'A', steps: [{ instruction: 'a' }, { id: 'x', instruction: 'b' }, { id: 'x', instruction: 'c' }] });
  assert.deepEqual(r.steps.map(s => s.id), ['s1', 'x', 'x_2']);
  // Re-normalizing (storage reload, edit) keeps the same ids
  assert.deepEqual(normalizeRecipe(r).steps.map(s => s.id), ['s1', 'x', 'x_2']);
});
test('timer follows its step after an edit', () => {
  const before = normalizeRecipe({ id: 'r', title: 'A', steps: [{ id: 'a', instruction: 'a' }, { id: 'b', title: 'Luộc', instruction: 'b' }] });
  const timer = { recipeId: 'r', stepId: 'b', stepIndex: 1, stepTitle: 'Luộc', status: 'running' };
  // A step inserted before it: the timer moves to index 2, same title
  const inserted = normalizeRecipe({ ...before, steps: [before.steps[0], { id: 'n', title: 'Mới', instruction: 'n' }, before.steps[1]] });
  assert.deepEqual([relocateTimerStep(timer, before, inserted).stepIndex, relocateTimerStep(timer, before, inserted).stepTitle], [2, 'Luộc']);
  // Its own step deleted: the timer stops instead of pointing at another step
  const removed = normalizeRecipe({ ...before, steps: [before.steps[0]] });
  assert.equal(relocateTimerStep(timer, before, removed), null);
  // Timer saved before step ids existed is matched through the previous recipe
  const legacy = { ...timer, stepId: undefined };
  assert.equal(relocateTimerStep(legacy, before, inserted).stepIndex, 2);
  // Other recipes' timers are untouched
  assert.equal(relocateTimerStep({ ...timer, recipeId: 'other' }, before, removed).stepIndex, 1);
});
test('categories and limits are consistent', () => {
  assert.equal(normalizeCategory('Món chính 🍲'), 'Món chính 🍲');
  assert.equal(normalizeCategory('mon chinh'), 'Món chính 🍲');
  assert.equal(normalizeCategory('Tráng miệng'), 'Tráng miệng 🍰');
  assert.equal(normalizeCategory('Đồ nướng BBQ'), 'Món chính 🍲');
  assert.equal(normalizeCategory('Tất cả'), 'Món chính 🍲');
  const big = normalizeRecipe({ title: 'A', servings: 80, steps: [{ instruction: 'x', timerSeconds: 99999 }] });
  assert.equal(big.servings, SERVINGS_MAX);
  assert.equal(big.steps[0].timerSeconds, TIMER_SECONDS_MAX);
  // A QR code with an unknown category still lands in a filterable category
  const qr = decodeRecipeFromQr(JSON.stringify({ title: 'B', category: 'Lạ', servings: 80, steps: [{ instruction: 'x' }] }));
  assert.equal(normalizeRecipe(qr).category, 'Món chính 🍲');
  assert.equal(qr.servings, SERVINGS_MAX);
});
test('QR round trip + local media dropped', () => {
  for (const recipe of INITIAL_RECIPES) {
    const { payload, truncated, tooLarge } = encodeRecipeForQr(recipe);
    const back = decodeRecipeFromQr(payload);
    assert.equal(back.title, recipe.title);
    assert.equal(back.ingredients.length, recipe.ingredients.length);
    assert.equal(back.steps.length, recipe.steps.length);
    assert.equal(recipeSignature(back), recipeSignature(recipe));
    assert.equal(tooLarge, false);
    if (!truncated) assert.equal(back.videoUrl, recipe.videoUrl);
  }
  const local = { ...INITIAL_RECIPES[0], imageUrl: 'file:///x.jpg', videoUrl: undefined };
  assert.ok(!encodeRecipeForQr(local).payload.includes('file://'));
  assert.throws(() => decodeRecipeFromQr('CF1:{bad'));
});
test('unit catalog', () => {
  assert.equal(normalizeUnit('gram'), 'g');
  assert.equal(normalizeUnit(' Gr '), 'g');
  assert.equal(normalizeUnit('Lít'), 'lít');
  assert.equal(normalizeUnit('thìa canh'), 'muỗng canh');
  assert.equal(normalizeUnit('nắm'), 'nắm'); // unknown units are kept as typed
  assert.deepEqual(addQuantities({ amount: '300', unit: 'g' }, { amount: '0,5', unit: 'kg' }), { amount: '800', unit: 'g' });
  assert.deepEqual(addQuantities({ amount: '600', unit: 'gram' }, { amount: '600', unit: 'g' }), { amount: '1,2', unit: 'kg' });
  assert.deepEqual(addQuantities({ amount: '1', unit: 'lít' }, { amount: '250', unit: 'ml' }), { amount: '1250', unit: 'ml' });
  assert.deepEqual(addQuantities({ amount: '1', unit: 'lít' }, { amount: '500', unit: 'ml' }), { amount: '1,5', unit: 'lít' });
  assert.deepEqual(addQuantities({ amount: '2', unit: 'quả' }, { amount: '1', unit: 'trái' }), { amount: '3', unit: 'quả' });
  assert.equal(addQuantities({ amount: '2', unit: 'quả' }, { amount: '100', unit: 'g' }), null);
  assert.equal(addQuantities({ amount: 'Vừa đủ', unit: 'g' }, { amount: '100', unit: 'g' }), null);
  // Recipes store canonical units
  assert.equal(normalizeRecipe({ title: 'A', ingredients: [{ name: 'Bột', amount: '100', unit: 'gram' }] }).ingredients[0].unit, 'g');
});
test('shopping merge across units', () => {
  let { list, added, merged } = mergeIntoShoppingList([], [{ name: 'Thịt bò', amount: '300', unit: 'gram' }], 'Món A');
  assert.deepEqual([added, merged, list[0].unit], [1, 0, 'g']);
  ({ list, added, merged } = mergeIntoShoppingList(list, [{ name: 'thit bo', amount: '0,5', unit: 'kg' }], 'Món B'));
  assert.deepEqual([added, merged, list.length, list[0].amount, list[0].unit, list[0].recipeTitle], [0, 1, 1, '800', 'g', 'Món A, Món B']);
  // Incompatible units and bought rows are never merged
  ({ list } = mergeIntoShoppingList(list, [{ name: 'Thịt bò', amount: '1', unit: 'miếng' }], 'Món C'));
  assert.equal(list.length, 2);
  const bought = list.map(item => ({ ...item, checked: true }));
  assert.equal(mergeIntoShoppingList(bought, [{ name: 'Thịt bò', amount: '100', unit: 'g' }], 'Món D').added, 1);
  // Same text amounts merge without changing the amount
  ({ list } = mergeIntoShoppingList([], [{ name: 'Muối', amount: 'Vừa đủ' }, { name: 'muối', amount: 'vừa đủ' }], 'X'));
  assert.equal(list.length, 1);
});
test('pantry helpers', () => {
  const ingredients = [{ id: 'a', name: 'Thịt bò phi lê' }, { id: 'b', name: 'Muối' }, { id: 'c', name: 'Hành tây' }];
  assert.deepEqual(ingredientsOnHand(ingredients, ['Thịt bò'], true).map(i => i.id), ['a', 'b']);
  assert.deepEqual(ingredientsOnHand(ingredients, ['Thịt bò'], false).map(i => i.id), ['a']);
  assert.ok(isStapleIngredient('Muối hột'));
  assert.deepEqual(pantryItemsUsedBy({ ingredients }, ['Thịt bò', 'Trứng gà', 'Hành tây']), ['Thịt bò', 'Hành tây']);
});
test('cooking session step follows the step id', () => {
  const recipe = normalizeRecipe({ id: 'r', title: 'A', steps: [{ id: 'a', instruction: 'a' }, { id: 'b', instruction: 'b' }, { id: 'c', instruction: 'c' }] });
  assert.equal(getSessionStepIndex({ stepId: 'c', stepIndex: 2 }, recipe), 2);
  const edited = normalizeRecipe({ ...recipe, steps: [recipe.steps[2], recipe.steps[0]] });
  assert.equal(getSessionStepIndex({ stepId: 'c', stepIndex: 2 }, edited), 0); // moved
  assert.equal(getSessionStepIndex({ stepId: 'b', stepIndex: 1 }, edited), 1); // deleted → keep position
  assert.equal(getSessionStepIndex({ stepId: 'zz', stepIndex: 9 }, edited), 1); // clamped
  assert.equal(getSessionStepIndex(null, recipe), 0);
});
const { makeHistoryEntry, recipeStats, sanitizeHistory, formatCookedDay } = await import(`${R}/utils/history.js`);
const { detectAllergens, userAllergensIn, filterRecipes, normalizeTags } = await import(`${R}/utils/dietary.js`);
const { restoreTimers, finishDueTimers, sortTimers, MAX_TIMERS } = await import(`${R}/utils/timers.js`);
const { buildBackup, parseBackup } = await import(`${R}/utils/backup.js`);

test('cooking history and stats', () => {
  const recipe = { id: 'r1', title: 'Phở', servings: 2 };
  const a = makeHistoryEntry({ recipe, servings: 4, startedAt: 1000, finishedAt: 5000, rating: 5, note: ' ngon ' });
  const b = makeHistoryEntry({ recipe, servings: 2, finishedAt: 9000, rating: 0 });
  assert.deepEqual([a.rating, a.note, a.servings, b.rating], [5, 'ngon', 4, null]);
  assert.equal(makeHistoryEntry({ recipe: null }), null);
  const stats = recipeStats([b, a, makeHistoryEntry({ recipe: { id: 'x', title: 'X' }, rating: 1 })], 'r1');
  assert.deepEqual(stats, { count: 2, lastAt: 9000, avgRating: 5 });
  assert.deepEqual(recipeStats([], 'r1'), { count: 0, lastAt: null, avgRating: null });
  // Storage/backup data is cleaned and sorted newest first
  const clean = sanitizeHistory([{ recipeId: 'r1', finishedAt: 1, rating: 9 }, { recipeId: 'r1', finishedAt: 3 }, { finishedAt: 2 }, null]);
  assert.deepEqual(clean.map(e => [e.finishedAt, e.rating]), [[3, null], [1, null]]);
  const now = new Date(2026, 10, 2, 20).getTime();
  assert.equal(formatCookedDay(new Date(2026, 10, 2, 8).getTime(), now), 'Hôm nay');
  assert.equal(formatCookedDay(new Date(2026, 10, 1, 23).getTime(), now), 'Hôm qua');
  assert.equal(formatCookedDay(new Date(2026, 9, 1).getTime(), now), '01/10/2026');
});
test('allergen detection avoids false positives', () => {
  const ids = names => detectAllergens({ ingredients: names.map(name => ({ name })) }).map(a => a.id);
  assert.deepEqual(ids(['Tôm sú', 'Nước mắm']), ['seafood']);
  assert.deepEqual(ids(['Cà chua', 'Cà rốt', 'Cá hồi phi lê']), ['seafood']); // "cà" is not fish
  assert.deepEqual(ids(['Hạt óc chó']), ['nuts']); // walnut, not snail
  assert.deepEqual(ids(['Sữa đậu nành']), ['soy']); // soy milk is not dairy
  assert.deepEqual(ids(['Trứng gà', 'Nước tương']), ['egg', 'gluten', 'soy']);
  assert.deepEqual(ids(['Mè rang', 'Me chua']), ['sesame']); // tamarind is not sesame
  assert.deepEqual(ids(['Thịt bò', 'Hành tây', 'Muối']), []);
  INITIAL_RECIPES.forEach(r => detectAllergens(r));
  assert.deepEqual(normalizeTags(['chay', 'Không cay', 'lạ']), ['Chay', 'Không cay']);
});
test('explore filters', () => {
  const recipes = [
    { id: 'a', title: 'Gỏi tôm', category: 'Món nhanh ⚡', difficulty: 'Dễ', prepTimeMinutes: 10, cookTimeMinutes: 0, tags: ['Eat clean'], ingredients: [{ name: 'Tôm' }] },
    { id: 'b', title: 'Bò kho', category: 'Món chính 🍲', difficulty: 'Khó', prepTimeMinutes: 30, cookTimeMinutes: 90, tags: [], ingredients: [{ name: 'Thịt bò' }] }
  ];
  const ids = opts => filterRecipes(recipes, opts).visible.map(r => r.id);
  assert.deepEqual(ids({ maxMinutes: 15 }), ['a']);
  assert.deepEqual(ids({ difficulty: 'Khó' }), ['b']);
  assert.deepEqual(ids({ tag: 'Eat clean' }), ['a']);
  assert.deepEqual(ids({ query: 'bo' }), ['b']);
  const hidden = filterRecipes(recipes, { allergies: ['seafood'], hideAllergens: true });
  assert.deepEqual([hidden.visible.map(r => r.id), hidden.hiddenByAllergy], [['b'], 1]);
  assert.equal(filterRecipes(recipes, { allergies: ['seafood'], hideAllergens: false }).visible.length, 2);
  assert.equal(userAllergensIn(recipes[0], ['seafood']).length, 1);
});
test('parallel timers', () => {
  const now = 100000;
  const legacy = { recipeId: 'r', stepId: 's2', stepIndex: 1, status: 'running', endAt: now - 1 };
  const restored = restoreTimers(null, legacy, now);
  assert.deepEqual([restored.length, restored[0].id, restored[0].status], [1, 'r:s2', 'done']);
  const list = [
    { id: 'r:a', recipeId: 'r', stepId: 'a', status: 'running', endAt: now + 5000 },
    { id: 'r:b', recipeId: 'r', stepId: 'b', status: 'running', endAt: now + 1000 },
    { id: 'r:c', recipeId: 'r', stepId: 'c', status: 'paused', remainingSeconds: 30 },
    { id: 'r:a', recipeId: 'r', stepId: 'a', status: 'paused', remainingSeconds: 3 }
  ];
  assert.equal(restoreTimers(list, null, now).length, 3); // duplicate ids dropped
  assert.deepEqual(sortTimers(list.slice(0, 3), now).map(t => t.id), ['r:b', 'r:a', 'r:c']);
  const { finished, timers } = finishDueTimers(list.slice(0, 3), now + 2000);
  assert.deepEqual([finished.map(t => t.id), timers.find(t => t.id === 'r:b').status, timers.find(t => t.id === 'r:a').status], [['r:b'], 'done', 'running']);
  assert.ok(MAX_TIMERS >= 2);
});
test('backup round trip and validation', () => {
  const custom = normalizeRecipe({ id: 'custom_1', isCustom: true, title: 'Món nhà', ingredients: [{ name: 'Bột', amount: '1', unit: 'kg' }], steps: [{ instruction: 'x' }] });
  const backup = buildBackup({
    recipes: [custom, normalizeRecipe(INITIAL_RECIPES[0])],
    favoriteIds: ['rec_01', 'custom_1'],
    shoppingList: [{ id: 's', name: 'Muối', amount: '1', unit: 'gói', checked: true }, { name: '' }],
    pantryIngredients: ['Trứng'],
    settings: { keepAwake: false, allergies: ['egg', 'unknown'], secret: 'x' },
    cookHistory: [makeHistoryEntry({ recipe: custom, rating: 4 })]
  });
  assert.equal(backup.data.recipes.length, 1); // built-in recipes are not exported
  const { data, summary } = parseBackup(JSON.stringify(backup));
  assert.deepEqual([summary.recipes, summary.shopping, summary.pantry, summary.history], [1, 1, 1, 1]);
  assert.deepEqual(data.settings, { keepAwake: false, allergies: ['egg'] }); // unknown keys dropped
  assert.equal(data.recipes[0].steps[0].id, 's1');
  assert.throws(() => parseBackup('not json'), /JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'other', data: {} })), /không phải/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'cookflow-backup', version: 99, data: {} })), /mới hơn/);
});

// ---------- Nutrition, meal plan, requests, categories ----------
const N = await import(`${R}/utils/nutrition.js`);
const MP = await import(`${R}/utils/mealPlan.js`);
const RQ = await import(`${R}/utils/recipeRequests.js`);
const CAT = await import(`${R}/utils/categories.js`);


test('kcal and macros are normalized per serving', () => {
  const r = normalizeRecipe({ title: 'A', calories: '450,6', nutrition: { protein: '20', carbs: -3, fat: 'x' }, steps: [{ instruction: 'x' }] });
  assert.equal(r.calories, 451);
  assert.deepEqual(r.nutrition, { protein: 20, carbs: null, fat: null });
  assert.equal(normalizeRecipe({ title: 'B', calories: 0 }).calories, null);
  assert.equal(normalizeRecipe({ title: 'C', calories: 99999 }).calories, N.KCAL_MAX);
  assert.equal(N.caloriesFromMacros({ protein: 10, carbs: 10, fat: 10 }), 170);
  for (const recipe of INITIAL_RECIPES) {
    assert.ok(normalizeRecipe(recipe).calories > 0, recipe.title);
    assert.ok(N.hasMacros(normalizeRecipe(recipe)), recipe.title);
  }
});
test('kcal estimate from ingredients', () => {
  const eggs = N.estimateCalories({ servings: 2, ingredients: [{ name: 'Trứng gà', amount: '4', unit: 'quả' }, { name: 'Muối', amount: 'Vừa đủ', unit: '' }] });
  assert.equal(eggs.perServing, 145); // 4 × 50 g × 143 / 100 / 2 ≈ 143 → 145
  assert.deepEqual(eggs.unmatched, []);
  const rice = N.estimateCalories({ servings: 1, ingredients: [{ name: 'Gạo', amount: '0,1', unit: 'kg' }, { name: 'Lá lạ', amount: '1', unit: 'g' }] });
  assert.equal(rice.perServing, 360);
  assert.deepEqual(rice.unmatched, ['Lá lạ']);
  // "cà rốt" is not fish ("cá"), "bơ lạt" is butter not avocado
  assert.equal(N.findFood('Cà rốt baby').key, 'ca rot');
  assert.equal(N.findFood('Bơ lạt').kcal, 717);
  assert.equal(N.estimateCalories({ ingredients: [] }).perServing, null);
});
test('meal plan dates and entries', () => {
  assert.equal(MP.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(MP.addDays('2026-01-01', -1), '2025-12-31');
  const week = MP.weekOf('2026-11-04'); // Wednesday
  assert.equal(week[0], '2026-11-02');
  assert.equal(week[6], '2026-11-08');
  assert.equal(MP.weekdayLabel('2026-11-08'), 'CN');
  assert.equal(MP.dayTitle('2026-11-05', '2026-11-04'), 'Ngày mai');
  const recipe = normalizeRecipe(INITIAL_RECIPES[0]);
  const past = MP.makeMealEntry({ date: '2026-11-01', slot: 'dinner', recipe }, '2026-11-04');
  const future = MP.makeMealEntry({ date: '2026-11-06', slot: 'xxx', recipe, servings: 8 }, '2026-11-04');
  assert.equal(past.eaten, true);
  assert.equal(future.eaten, false);
  assert.equal(future.slot, 'lunch');
  assert.equal(MP.makeMealEntry({ date: 'hôm nay', title: 'x' }), null);
  assert.equal(MP.makeMealEntry({ date: '2026-11-06', title: '   ' }), null);
  const free = MP.makeMealEntry({ date: '2026-11-04', slot: 'breakfast', title: 'Phở ngoài hàng', calories: 450 }, '2026-11-04');
  const get = id => (id === recipe.id ? recipe : null);
  const today = MP.mealsForDay([free], [], '2026-11-04', get);
  assert.equal(MP.dayCalories(today).planned, 450);
  // kcal counts the portions the user ate, not the portions cooked (servings)
  assert.equal(free.portionsEaten, 1);
  const bigBatch = { ...future, date: '2026-11-04', calories: 520, servings: 16, portionsEaten: 1.5, eaten: true };
  assert.equal(MP.mealKcal(bigBatch), 780);
  assert.equal(MP.dayCalories(MP.mealsForDay([bigBatch], [], '2026-11-04', get)).eaten, 780);
  assert.equal(MP.clampPortions(1.6), 1.5);
  assert.equal(MP.clampPortions(0), 1);
  assert.equal(MP.clampPortions(99), 10);
  assert.equal(MP.formatPortions(0.25), '0,25');
  assert.equal(MP.sanitizeMealPlan([{ ...free, portionsEaten: undefined }])[0].portionsEaten, 1);
  // Recipe dishes follow the recipe's kcal; cooked-mode history shows up on its day
  const finishedAt = new Date(2026, 10, 1, 19, 0).getTime();
  const day = MP.mealsForDay([past], [{ id: 'h1', recipeId: 'other', recipeTitle: 'Món khác', servings: 2, finishedAt }], '2026-11-01', get);
  assert.equal(day.length, 2);
  assert.equal(MP.dayCalories(day).eaten, recipe.calories);
  // Same dish logged by hand and cooked in the same slot counts once
  const dup = MP.mealsForDay([past], [{ id: 'h2', recipeId: recipe.id, recipeTitle: recipe.title, servings: 2, finishedAt }], '2026-11-01', get);
  assert.equal(dup.length, 1);
  const items = MP.plannedIngredients([future, past], '2026-11-02', '2026-11-08', get, scaleAmount);
  assert.equal(items.length, recipe.ingredients.length); // only the planned (not eaten) dish
  assert.equal(items[0].amount, scaleAmount(recipe.ingredients[0].amount, 8 / recipe.servings));
  const clean = MP.sanitizeMealPlan([future, past, { date: 'bad', title: 'x' }, null]);
  assert.deepEqual(clean.map(e => e.date), ['2026-11-01', '2026-11-06']);
});
test('recipe requests validation', () => {
  const user = { email: 'a@b.vn', name: 'An' };
  const recipe = { id: 'rec_01', title: 'Trứng' };
  assert.ok(RQ.buildRequest({ type: 'wrong_info', details: 'Định lượng muối quá nhiều', user }).errors.includes('Chọn công thức cần báo cáo.'));
  assert.ok(RQ.buildRequest({ type: 'new_recipe', title: 'Bún bò', details: 'ngắn', user }).errors.length);
  const ok = RQ.buildRequest({ type: 'new_recipe', title: 'Bún bò Huế', details: 'Mình muốn có công thức bún bò Huế chuẩn vị.', user });
  assert.equal(ok.request.status, 'pending');
  const again = RQ.buildRequest({ type: 'new_recipe', title: 'bún bò huế', details: 'Gửi lại lần nữa cho chắc nhé.', user }, [ok.request]);
  assert.ok(again.errors[0].includes('đã gửi'));
  const report = RQ.buildRequest({ type: 'wrong_info', recipe, details: 'Kcal của món bị sai nhiều.', user }, [ok.request]);
  assert.equal(report.request.recipeId, 'rec_01');
  const done = RQ.applyRequestUpdate(report.request, { status: 'resolved', adminReply: ' Đã sửa ' });
  assert.equal(done.status, 'resolved');
  assert.equal(done.adminReply, 'Đã sửa');
  assert.equal(RQ.applyRequestUpdate(done, { status: 'lạ' }).status, 'resolved');
  assert.equal(RQ.countByStatus([ok.request, done]).pending, 1);
  assert.equal(RQ.buildRequest({ type: 'improve', recipe, details: 'Thêm video từng bước nhé', user: null }).errors[0], 'Bạn cần đăng nhập để gửi yêu cầu.');
});
test('admin categories drive recipe normalization', () => {
  try {
    assert.equal(CAT.validateCategoryName('  ', CAT.DEFAULT_CATEGORIES), 'Tên danh mục không được để trống.');
    assert.equal(CAT.validateCategoryName('mon chinh', CAT.DEFAULT_CATEGORIES), 'Danh mục này đã tồn tại.');
    assert.equal(CAT.validateCategoryName('Món chính 🍲', CAT.DEFAULT_CATEGORIES, 'Món chính 🍲'), null);
    assert.ok(CAT.validateCategoryName('tat ca', []));
    CAT.setRecipeCategories([...CAT.DEFAULT_CATEGORIES, 'Đồ nướng 🔥']);
    assert.equal(normalizeCategory('do nuong'), 'Đồ nướng 🔥');
    CAT.setRecipeCategories(['Ăn sáng', 'Ăn tối']);
    assert.equal(normalizeCategory('Món chính 🍲'), 'Ăn sáng'); // deleted category → first remaining
    assert.deepEqual(CAT.sanitizeCategories(['', 'Tất cả', 'A', 'a']), ['A']);
    assert.deepEqual(CAT.sanitizeCategories([]), CAT.DEFAULT_CATEGORIES);
  } finally {
    CAT.setRecipeCategories(CAT.DEFAULT_CATEGORIES);
  }
});
test('backup carries the meal plan and kcal goal', () => {
  const entry = MP.makeMealEntry({ date: '2026-11-04', slot: 'lunch', title: 'Cơm gà', calories: 600 });
  const file = JSON.stringify(buildBackup({ recipes: [], mealPlan: [entry], settings: { calorieGoal: 1800 } }));
  const { data, summary } = parseBackup(file);
  assert.equal(data.mealPlan[0].title, 'Cơm gà');
  assert.equal(data.settings.calorieGoal, 1800);
  assert.equal(summary.meals, 1);
});
