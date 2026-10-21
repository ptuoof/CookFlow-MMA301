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
    'Bám sát công thức bên dưới: chỉ nói về nguyên liệu, định lượng và các bước có trong công thức này. ' +
      'Không tự thêm nguyên liệu không có trong danh sách rồi coi như món đang dùng; nếu người dùng hỏi về thứ món này không có, nói rõ là món này không dùng nguyên liệu đó.',
    'Khi gợi ý thay thế nguyên liệu/gia vị, luôn nêu TỈ LỆ QUY ĐỔI cụ thể dựa trên định lượng trong công thức (ví dụ: 150 ml nước tương → 120 ml nước mắm pha 30 ml nước).',
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

/**
 * Sends a question to Gemini with the recipe as context.
 * @param history previous messages [{ role: 'user' | 'model', text }]
 * @returns the assistant reply text. Throws Error with a user-facing message on failure.
 */
export const askSousChef = async ({ apiKey, recipe, currentStep, history = [], question, signal }) => {
  if (!apiKey) throw new Error('Chưa có API key Gemini.');

  const contents = [...history.slice(-MAX_HISTORY_MESSAGES), { role: 'user', text: question }].map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

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
        systemInstruction: { parts: [{ text: buildSystemPrompt(recipe, currentStep) }] },
        contents,
        generationConfig: { temperature: 0.7 }
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
  return stripMarkdown(text);
};
