// Google Gemini REST client for the AI Sous-Chef.
// The API key comes from the user (saved locally) or EXPO_PUBLIC_GEMINI_API_KEY in .env.
// Get a free key at https://aistudio.google.com/apikey
import { safeStorage } from '../context/RecipeContext';

const STORAGE_KEY_GEMINI = '@cookflow_gemini_key';
export const GEMINI_MODEL = 'gemini-flash-latest';
export const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_HISTORY_MESSAGES = 10;

export const getGeminiApiKey = async () => {
  const stored = await safeStorage.getItem(STORAGE_KEY_GEMINI);
  return stored || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
};

export const saveGeminiApiKey = key => safeStorage.setItem(STORAGE_KEY_GEMINI, key.trim());

export const clearGeminiApiKey = () => safeStorage.removeItem(STORAGE_KEY_GEMINI);

const describeRecipe = (recipe, currentStep) => {
  if (!recipe) return 'Người dùng chưa chọn món cụ thể.';
  const ingredients = recipe.ingredients.map(i => `- ${i.name}: ${i.amount} ${i.unit}`).join('\n');
  const steps = recipe.steps.map(s => `${s.stepNumber}. ${s.title}: ${s.instruction}`).join('\n');
  const lines = [
    `Món: ${recipe.title} (${recipe.category}, độ khó ${recipe.difficulty}, ${recipe.servings} người ăn, ` +
      `${recipe.prepTimeMinutes + recipe.cookTimeMinutes} phút${recipe.calories ? `, ~${recipe.calories} kcal/phần` : ''})`,
    `Mô tả: ${recipe.description}`,
    `Nguyên liệu:\n${ingredients}`,
    `Các bước:\n${steps}`
  ];
  if (currentStep) {
    lines.push(`Người dùng đang ở BƯỚC ${currentStep.stepNumber}: ${currentStep.title} — ${currentStep.instruction}`);
  }
  return lines.join('\n\n');
};

const buildSystemPrompt = (recipe, currentStep) =>
  [
    'Bạn là "CookFlow AI Sous-Chef" — phụ bếp AI thân thiện, giàu kinh nghiệm ẩm thực Việt Nam và quốc tế.',
    'Luôn trả lời bằng tiếng Việt, ngắn gọn (tối đa khoảng 180 từ), thực tế, dễ làm tại bếp gia đình.',
    'Bám sát công thức bên dưới: trả lời dựa trên đúng nguyên liệu, định lượng và các bước của món này. ' +
      'Không bịa ra nguyên liệu hay bước mà công thức không có rồi coi như món đang dùng; nếu người dùng hỏi về nguyên liệu món này không dùng, nói rõ điều đó. ' +
      'Khi đưa thêm thứ mới (thức uống kèm, biến tấu, nguyên liệu thay thế), ghi rõ đó là gợi ý thêm ngoài công thức.',
    'Khi gợi ý thay thế nguyên liệu/gia vị, luôn nêu TỈ LỆ QUY ĐỔI cụ thể, tính theo đúng định lượng ghi trong công thức (ví dụ: 1 muỗng canh bơ = khoảng 2,5 muỗng cà phê dầu ô liu).',
    'Chỉ dùng văn bản thuần: gạch đầu dòng bằng "•", KHÔNG dùng markdown (không **, #, bảng).',
    'Nếu câu hỏi không liên quan đến nấu ăn, lịch sự hướng người dùng quay lại chủ đề bếp núc.',
    '',
    'Ngữ cảnh công thức hiện tại:',
    describeRecipe(recipe, currentStep)
  ].join('\n');

const errorMessageFor = (status, body) => {
  const reason = body?.error?.details?.find(d => d.reason)?.reason;
  if (reason === 'API_KEY_INVALID' || status === 401 || status === 403) {
    return 'API key Gemini không hợp lệ hoặc chưa được cấp quyền. Hãy kiểm tra lại key (nút 🔑).';
  }
  if (status === 429) return 'Bạn đã vượt hạn mức miễn phí của Gemini. Đợi một chút rồi thử lại nhé.';
  if (status >= 500) return 'Máy chủ Gemini đang bận. Thử lại sau ít phút.';
  return body?.error?.message || `Gemini trả về lỗi (${status}).`;
};

// Gemini occasionally still emits markdown despite instructions; RN <Text> shows it raw.
const stripMarkdown = text =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();

const toContents = messages => messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

// Shared HTTP call: timeout, abort, error mapping. Returns the reply text.
const generateContent = async ({ apiKey, systemPrompt, messages, generationConfig, signal }) => {
  if (!apiKey) throw new Error('Chưa có API key Gemini.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onExternalAbort);

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: toContents(messages),
        generationConfig
      }),
      signal: controller.signal
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    if (controller.signal.aborted) throw new Error('Gemini phản hồi quá lâu. Kiểm tra mạng rồi thử lại.');
    throw new Error('Không kết nối được tới Gemini. Kiểm tra kết nối Internet.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.('abort', onExternalAbort);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessageFor(response.status, body));

  if (body?.promptFeedback?.blockReason) {
    throw new Error('Câu hỏi bị bộ lọc an toàn của Gemini chặn. Hãy diễn đạt lại nhé.');
  }
  const text = (body?.candidates?.[0]?.content?.parts || [])
    .filter(p => !p.thought)
    .map(p => p.text || '')
    .join('');
  if (!text.trim()) throw new Error('Gemini không trả lời được câu này. Thử hỏi cách khác nhé.');
  return text;
};

/**
 * Sends a question to Gemini with the recipe as context.
 * @param history previous messages [{ role: 'user' | 'model', text }]
 * @returns the assistant reply text. Throws Error with a user-facing message on failure.
 */
export const askSousChef = async ({ apiKey, recipe, currentStep, history = [], question, signal }) => {
  const text = await generateContent({
    apiKey,
    systemPrompt: buildSystemPrompt(recipe, currentStep),
    messages: [...history.slice(-MAX_HISTORY_MESSAGES), { role: 'user', text: question }],
    generationConfig: { temperature: 0.7 },
    signal
  });
  return stripMarkdown(text);
};

// Structured output: each change replaces one existing ingredient (by id) with 0..n new ingredients.
const CHANGES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    changes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          replacesId: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                amount: { type: 'STRING' },
                unit: { type: 'STRING' }
              },
              required: ['name', 'amount', 'unit']
            }
          },
          reason: { type: 'STRING' }
        },
        required: ['replacesId', 'items']
      }
    }
  },
  required: ['changes']
};

const buildExtractionPrompt = recipe =>
  [
    'Bạn là bộ chuyển đổi dữ liệu cho ứng dụng nấu ăn CookFlow.',
    'Đọc câu trả lời của phụ bếp AI và chuyển các gợi ý THAY THẾ hoặc ĐỔI ĐỊNH LƯỢNG nguyên liệu thành JSON.',
    'Quy tắc:',
    '• replacesId PHẢI là một id trong danh sách nguyên liệu bên dưới (ví dụ "i2"). Không có id phù hợp thì bỏ qua gợi ý đó.',
    '• items là các nguyên liệu mới thay cho nguyên liệu gốc (có thể 1 hoặc nhiều thứ, ví dụ nước mắm + nước lọc). Chỉ đổi định lượng thì items gồm đúng nguyên liệu đó với định lượng mới. Bỏ hẳn nguyên liệu thì items rỗng.',
    '• Định lượng tính cho đúng khẩu phần của công thức, amount là số hoặc chữ ngắn (ví dụ "60", "1/2", "Vừa đủ").',
    '• Nếu câu trả lời đưa nhiều phương án cho cùng một nguyên liệu, chỉ chọn phương án đầu tiên.',
    '• Không đổi các bước nấu. Không có thay đổi nguyên liệu cụ thể nào thì trả về changes rỗng.',
    '• reason: một câu ngắn tiếng Việt giải thích.',
    '',
    `Món: ${recipe.title} (${recipe.servings} người ăn)`,
    'Nguyên liệu (id: tên — định lượng):',
    ...recipe.ingredients.map(i => `${i.id}: ${i.name} — ${i.amount} ${i.unit}`)
  ].join('\n');

const cleanText = (value, max = 80) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '');

/**
 * Turns a free-text Sous-Chef answer into structured ingredient changes for the given recipe.
 * Only changes pointing at real ingredient ids are kept (one per ingredient).
 * @returns [{ replacesId, original, items: [{ name, amount, unit }], reason }]
 */
export const extractIngredientChanges = async ({ apiKey, recipe, question, answer, signal }) => {
  const text = await generateContent({
    apiKey,
    systemPrompt: buildExtractionPrompt(recipe),
    messages: [
      { role: 'user', text: `Câu hỏi của người dùng: ${question}\n\nCâu trả lời của phụ bếp AI:\n${answer}` }
    ],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json', responseSchema: CHANGES_SCHEMA },
    signal
  });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Không đọc được gợi ý thay thế từ Gemini. Thử lại nhé.');
  }

  const byId = new Map(recipe.ingredients.map(i => [i.id, i]));
  const seen = new Set();
  return (Array.isArray(parsed?.changes) ? parsed.changes : []).flatMap(change => {
    const original = byId.get(change?.replacesId);
    if (!original || seen.has(original.id)) return [];
    seen.add(original.id);
    const items = (Array.isArray(change.items) ? change.items : [])
      .map(item => ({ name: cleanText(item?.name), amount: cleanText(item?.amount, 20) || 'Vừa đủ', unit: cleanText(item?.unit, 30) }))
      .filter(item => item.name)
      .slice(0, 4);
    return [{ replacesId: original.id, original, items, reason: cleanText(change.reason, 200) }];
  });
};
