import test from 'node:test';
import assert from 'node:assert/strict';
// Business-rule tests for the pure helpers (no React Native runtime needed).
const R = new URL('../src', import.meta.url).href;
const { scaleAmount, addAmounts, parseAmount, parseIntInRange } = await import(`${R}/utils/quantity.js`);
const { normalizeVi, matchesSearch, containsPhrase } = await import(`${R}/utils/text.js`);
const { getGroceryAisle } = await import(`${R}/utils/groceryAisles.js`);
const { normalizeRecipe, recipeSignature, normalizeCategory, relocateTimerStep } = await import(`${R}/utils/recipeModel.js`);
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
