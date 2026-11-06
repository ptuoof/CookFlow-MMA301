// Contract test: runs the app's API service modules (as AuthContext / RecipeContext call them) against the real
// CookFlow backend (repo SDN302/CookFlow) on an in-memory MongoDB. react-native is stubbed (Platform.OS = "web").
//   COOKFLOW_BACKEND_DIR=<path to the backend repo> npm run test:api
// The backend needs its dependencies installed (npm install there).
import { register, createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const feDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const beDir = process.env.COOKFLOW_BACKEND_DIR && path.resolve(process.env.COOKFLOW_BACKEND_DIR);
if (!beDir) {
  console.error('Set COOKFLOW_BACKEND_DIR to the backend repository (SDN302/CookFlow).');
  process.exit(1);
}
// Run from the backend folder and reuse the MongoDB binary its tests already downloaded
// (npm sets INIT_CWD to this repo, which mongodb-memory-server would use to pick a new cache)
process.chdir(beDir);
process.env.INIT_CWD = beDir;
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.join(beDir, 'node_modules', '.cache', 'mongodb-memory-server');
const hooks = `
export async function resolve(spec, ctx, next) {
  if (spec === 'react-native') return { url: 'data:text/javascript,export const Platform={OS:"web"};', shortCircuit: true };
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') || spec.startsWith('/')) return next(spec + '.js', ctx);
    throw e;
  }
}
export async function load(url, ctx, next) {
  if (url.includes('/src/') && url.endsWith('.js')) return { ...(await next(url, { ...ctx, format: 'module' })), format: 'module' };
  return next(url, ctx);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`, import.meta.url);

const require = createRequire(beDir + '/package.json');
const { startTestServer } = require('./test/helpers/testServer.js');
const server = await startTestServer();
process.env.EXPO_PUBLIC_API_URL = server.baseUrl;

let failed = 0;
const check = (cond, msg, detail) => {
  console.log(cond ? '  PASS' : '  FAIL', msg, cond ? '' : JSON.stringify(detail)?.slice(0, 500));
  if (!cond) failed++;
};
const imp = p => import(pathToFileURL(`${feDir}/src/${p}`).href);

try {
  const client = await imp('services/api/client.js');
  const auth = await imp('services/api/auth.js');
  const users = await imp('services/api/users.js');
  const recipesApi = await imp('services/api/recipes.js');
  const shop = await imp('services/api/shopping.js');
  const pantry = await imp('services/api/pantry.js');
  const history = await imp('services/api/history.js');
  const meal = await imp('services/api/mealPlan.js');
  const requests = await imp('services/api/requests.js');
  const upload = await imp('services/api/upload.js');
  const { normalizeRecipe, relocateTimerStep } = await imp('utils/recipeModel.js');
  const { setRecipeCategories } = await imp('utils/categories.js');
  const { buildBackup, parseBackup } = await imp('utils/backup.js');

  console.log('Auth');
  const email = `fe_${Date.now()}@test.com`;
  const reg = await auth.register({ name: 'FE Tester', email, password: 'Password1' });
  check(reg.email === email && /^\d{6}$/.test(reg.devCode), 'register -> code', reg);
  let ended = null;
  client.setSessionEndHandler(info => { ended = info; });
  try { await auth.login(email, 'Password1'); check(false, 'login unverified should fail'); }
  catch (e) { check(e.code === 'EMAIL_NOT_VERIFIED' && e.data.email === email && ended === null, 'login unverified -> EMAIL_NOT_VERIFIED (no session-end)', e); }
  const verified = await auth.verifyEmail(email, reg.devCode);
  client.setAuthToken(verified.token);
  const me = await auth.fetchMe();
  check(me.user.name === 'FE Tester' && me.settings.calorieGoal === 2000, 'verify -> token, fetchMe', me);
  check((await auth.updateProfile({ name: 'FE Đổi Tên' })).name === 'FE Đổi Tên', 'updateProfile');
  await auth.changePassword('Password1', 'Password2');
  const forgot = await auth.forgotPassword(email);
  await auth.resetPassword(email, forgot.devCode, 'Password3');
  const relog = await auth.login(email, 'Password3');
  client.setAuthToken(relog.token);
  check(!!relog.token, 'change + forgot/reset password, login again');

  console.log('Categories & recipes (as RecipeContext loads them)');
  const cats = await recipesApi.fetchCategories();
  setRecipeCategories(cats.names);
  check(cats.names.length === 5 && cats.categories.every(c => c.id && typeof c.recipeCount === 'number'), 'fetchCategories', cats.names);
  const all = (await recipesApi.fetchAllRecipes()).map(normalizeRecipe);
  check(all.length === 6 && all.every(r => r.id && r.type === 'system' && !r.isCustom && !r.isOwner), 'fetchAllRecipes -> 6 built-in, normalizeRecipe keeps server fields', all.map(r => r.id));

  // Same payload shape as CreateRecipeModal (local ids, isPublic in payload)
  const form = {
    title: 'Món FE', description: 'x', imageUrl: '', category: 'Món chính 🍲', prepTimeMinutes: 0, cookTimeMinutes: 10, servings: 2,
    difficulty: 'Vừa', tags: ['Chay'], calories: null, nutrition: { protein: 10, carbs: null, fat: null },
    ingredients: [{ id: 'i_local', name: 'Đậu hũ', amount: '200', unit: 'gram' }],
    steps: [{ id: 's_local1', title: 'B1', instruction: 'Cắt', timerSeconds: 60 }, { id: 's_local2', instruction: 'Chiên' }],
    isPublic: true, colorAccent: '#000'
  };
  const created = normalizeRecipe(await recipesApi.createRecipe(form, { isPublic: false }));
  check(created.isCustom && created.isOwner && created.isPublic === false && created.steps.every(s => /^[a-f0-9]{24}$/.test(s.id)), 'createRecipe (personal, private; option wins over payload)', created);

  // Copy of a built-in recipe ({...template} carries type 'system', isPublic true...)
  const template = all[0];
  const { id, isCustom, createdAt, updatedAt, ...rest } = template;
  const copy = normalizeRecipe(await recipesApi.createRecipe({ ...rest, title: `${template.title} (bản sao)`, copiedFrom: id }, { isPublic: false }));
  check(copy.type === 'personal' && copy.isPublic === false && copy.copiedFrom === id, 'copy of a system recipe stays personal & private', copy);

  // Edit: insert a step before the others (timers must stay on their step)
  const timer = { recipeId: created.id, stepId: created.steps[1].id, stepIndex: 1, status: 'running' };
  const edited = normalizeRecipe(await recipesApi.updateRecipe({ ...created, steps: [{ id: 'new', instruction: 'Rửa' }, ...created.steps], isPublic: true }));
  const moved = relocateTimerStep(timer, created, edited);
  check(edited.steps.length === 3 && moved?.stepIndex === 2 && moved.stepId === created.steps[1].id && edited.isPublic === true, 'updateRecipe keeps step ids -> relocateTimerStep follows the step', { moved, steps: edited.steps.map(s => s.id) });

  console.log('Favorites');
  const fav = await recipesApi.toggleFavorite(template.id);
  check(fav.isFavorite === true && (await recipesApi.fetchFavoriteIds()).includes(template.id), 'toggleFavorite / fetchFavoriteIds');

  console.log('Pantry');
  check((await pantry.togglePantryIngredient('Hành lá')).includes('Hành lá'), 'toggle');
  check((await pantry.addPantryIngredients(['hanh la', 'Muối'])).length === 2, 'add (accent-insensitive dedupe)');
  check((await pantry.removePantryIngredients(['muoi'])).length === 1, 'remove');
  check((await pantry.clearPantry()).length === 0, 'clear');

  console.log('Shopping');
  const bulk = await shop.addIngredientsToShopping([{ name: 'Đậu hũ', amount: '200', unit: 'g' }, { name: 'dau hu', amount: '0,3', unit: 'kg' }], 'Món FE');
  const list = await shop.fetchShoppingList();
  check(bulk.added === 1 && bulk.merged === 1 && list[0].amount === '500', 'bulk merges like the app', list);
  const { item: bought, pantry: pantryAfter } = await shop.setShoppingItemChecked(list[0].id, true);
  check(bought.checked && pantryAfter?.includes('Đậu hũ'), 'checked -> pantry (autoStockPantry)', { bought, pantryAfter });

  console.log('History / meal plan / requests');
  const entry = await history.addHistoryEntry({ recipeId: created.id, servings: 2, startedAt: Date.now() - 1000, rating: 5, note: 'ok' });
  check(typeof entry.finishedAt === 'number' && (await history.fetchHistory()).length === 1, 'history add / fetch');
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tomorrow = key(new Date(today.getTime() + 86400000));
  const planned = await meal.createMealEntry({ date: tomorrow, slot: 'dinner', recipeId: template.id, servings: 4 });
  check(planned.eaten === false && planned.title === template.title, 'meal plan create (future = plan)', planned);
  const patched = await meal.updateMealEntry(planned.id, { eaten: true });
  check(patched.eaten === true, 'meal plan toggle eaten');
  await meal.updateMealEntry(planned.id, { eaten: false });
  const toShop = await meal.addPlanToShopping(tomorrow, tomorrow);
  check(toShop.dishes === 1 && toShop.added + toShop.merged > 0, 'plan -> shopping', toShop);
  const copies = await meal.copyMealDay(tomorrow, key(new Date(today.getTime() + 2 * 86400000)));
  check(copies.length === 1, 'copy day');
  const reqd = await requests.createRequest({ type: 'new_recipe', title: 'Bún chả', details: 'Mong có công thức bún chả Hà Nội' });
  check(reqd.status === 'pending' && (await requests.fetchRequests(false)).length === 1, 'request create / mine');

  console.log('Settings & backup');
  const s = await users.updateSettings({ calorieGoal: 1800, allergies: ['egg'], hasSeenOnboarding: true });
  check(s.settings.calorieGoal === 1800 && s.hasSeenOnboarding === true, 'updateSettings + onboarding', s);
  // SettingsModal: exportBackup() (local build) -> file -> parseBackup -> restoreBackup (import)
  const own = (await recipesApi.fetchAllRecipes()).map(normalizeRecipe).filter(r => r.isCustom && r.isOwner);
  const file = JSON.stringify(buildBackup({ recipes: own, favoriteIds: await recipesApi.fetchFavoriteIds(), shoppingList: await shop.fetchShoppingList(), pantryIngredients: await pantry.fetchPantry(), settings: s.settings, cookHistory: await history.fetchHistory(), mealPlan: await meal.fetchMealPlan() }));
  const parsed = parseBackup(file);
  await users.resetData();
  check((await recipesApi.fetchAllRecipes()).filter(r => r.isOwner && r.isCustom).length === 0, 'resetData');
  const summary = await users.importData({ format: 'cookflow-backup', version: 1, data: parsed.data });
  check(summary.recipes === 2 && summary.favorites === 1 && summary.history === 1 && summary.meals === 2, 'export file -> parseBackup -> import restores everything', summary);

  console.log('Upload (web branch: data URI -> Blob)');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const url = await upload.uploadMedia(png, 'image');
  check(/\/uploads\/img-.*\.png$/.test(url), 'uploadMedia(image)', url);
  check((await upload.uploadMedia('https://example.com/a.jpg', 'image')) === 'https://example.com/a.jpg', 'web URL unchanged');
  require('fs').rmSync(require('path').join(beDir, 'public/uploads', url.split('/').pop()), { force: true });

  console.log('Admin & session end');
  const admin = await auth.login('admin@cookflow.demo', 'Admin123!');
  client.setAuthToken(admin.token);
  const { users: list2 } = await users.fetchUsers();
  const target = list2.find(u => u.email === email);
  await users.saveUser({ ...target, locked: true });
  const adminRecipes = await recipesApi.fetchAllRecipes();
  // (the import above re-created the user's recipes with new ids)
  check(adminRecipes.some(r => r.title === 'Món FE' && r.isCustom && !r.isOwner), 'admin sees every recipe (incl. other users\' private ones)');
  const catalog = await recipesApi.createRecipe({ title: 'Món kho chung', category: 'mon chinh', ingredients: [{ name: 'Gạo' }], steps: [{ instruction: 'Nấu' }] }, { system: true });
  check(catalog.type === 'admin' && catalog.isPublic, 'admin catalog recipe (system: true)', catalog);
  const newCat = await recipesApi.createCategory('Đồ nướng 🔥');
  const reordered = await recipesApi.reorderCategories(['Đồ nướng 🔥', ...cats.names]);
  const delCat = await recipesApi.deleteCategory(newCat.id);
  check(reordered.names[0] === 'Đồ nướng 🔥' && delCat.fallbackCategory.name === 'Món chính 🍲', 'category create / reorder / delete');
  const allRequests = await requests.fetchRequests(true);
  check((await requests.updateRequest(allRequests[0].id, { status: 'resolved', adminReply: 'Đã thêm' })).status === 'resolved', 'admin request review');

  // The locked user's old token now ends the session
  client.setAuthToken(relog.token);
  ended = null;
  try { await auth.fetchMe(); } catch { /* expected */ }
  check(ended?.code === 'ACCOUNT_LOCKED', 'locked account -> session-end handler fires', ended);
} catch (error) {
  console.error(error);
  failed++;
}
await server.stop();
console.log(failed ? `\nFE CONTRACT: ${failed} FAILED` : '\nFE CONTRACT: ALL PASSED');
process.exit(failed ? 1 : 0);
