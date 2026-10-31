import test from 'node:test';
import assert from 'node:assert/strict';
// Business-rule tests for the pure helpers (no React Native runtime needed).
const R = new URL('../src', import.meta.url).href;
const { scaleAmount, addAmounts, parseAmount, parseIntInRange } = await import(`${R}/utils/quantity.js`);
const { normalizeVi, matchesSearch, containsPhrase } = await import(`${R}/utils/text.js`);
const { getGroceryAisle } = await import(`${R}/utils/groceryAisles.js`);
const { normalizeRecipe, recipeSignature } = await import(`${R}/utils/recipeModel.js`);
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
