// User reports & recipe requests, reviewed by the admin.
// { id, type, title, details, recipeId | null, recipeTitle, userEmail, userName,
//   status, adminReply, createdAt, updatedAt }
import { makeId } from './recipeModel';

export const REQUEST_TYPES = [
  { id: 'new_recipe', label: 'Yêu cầu món mới', icon: '🍳', hint: 'Món bạn muốn CookFlow bổ sung công thức' },
  { id: 'wrong_info', label: 'Sai thông tin', icon: '⚠️', hint: 'Định lượng, kcal, thời gian hoặc bước nấu chưa đúng' },
  { id: 'improve', label: 'Góp ý cải thiện', icon: '💡', hint: 'Thêm video, mẹo, ảnh minh họa...' },
  { id: 'inappropriate', label: 'Nội dung không phù hợp', icon: '🚩', hint: 'Hình ảnh hoặc nội dung vi phạm' }
];
export const REQUEST_STATUSES = [
  { id: 'pending', label: 'Chờ duyệt', color: '#9A6100', bg: '#FFF4DB' },
  { id: 'in_progress', label: 'Đang xử lý', color: '#1971C2', bg: '#E7F5FF' },
  { id: 'resolved', label: 'Đã xử lý', color: '#287A49', bg: '#EBFBEE' },
  { id: 'rejected', label: 'Từ chối', color: '#B02500', bg: '#FFF0EC' }
];
const TYPE_IDS = REQUEST_TYPES.map(t => t.id);
const STATUS_IDS = REQUEST_STATUSES.map(s => s.id);
export const REQUEST_TITLE_MAX = 80;
export const REQUEST_DETAILS_MAX = 600;
export const REQUEST_LIMIT = 500;
/** Open requests one user may have at the same time (keeps the queue from being flooded). */
export const OPEN_REQUESTS_PER_USER = 10;

export const requestType = id => REQUEST_TYPES.find(t => t.id === id) || REQUEST_TYPES[0];
export const requestStatus = id => REQUEST_STATUSES.find(s => s.id === id) || REQUEST_STATUSES[0];
export const isOpenRequest = request => request.status === 'pending' || request.status === 'in_progress';

/**
 * Validates a new request. Returns { request } or { errors: string[] } (Vietnamese, user-facing).
 * A report about an existing recipe (any type but new_recipe) must point at that recipe.
 */
export const buildRequest = ({ type, title, details, recipe, user }, existing = []) => {
  const errors = [];
  const cleanType = TYPE_IDS.includes(type) ? type : null;
  const cleanTitle = String(title ?? '').trim();
  const cleanDetails = String(details ?? '').trim();
  if (!user?.email) errors.push('Bạn cần đăng nhập để gửi yêu cầu.');
  if (!cleanType) errors.push('Chọn loại yêu cầu.');
  if (cleanType === 'new_recipe' && cleanTitle.length < 2) errors.push('Nhập tên món bạn muốn có công thức.');
  if (cleanType && cleanType !== 'new_recipe' && !recipe?.id) errors.push('Chọn công thức cần báo cáo.');
  if (cleanTitle.length > REQUEST_TITLE_MAX) errors.push(`Tiêu đề tối đa ${REQUEST_TITLE_MAX} ký tự.`);
  if (cleanDetails.length < 10) errors.push('Mô tả chi tiết ít nhất 10 ký tự để quản trị viên xử lý được.');
  if (cleanDetails.length > REQUEST_DETAILS_MAX) errors.push(`Mô tả tối đa ${REQUEST_DETAILS_MAX} ký tự.`);
  const mine = (existing || []).filter(r => r.userEmail === user?.email && isOpenRequest(r));
  if (mine.length >= OPEN_REQUESTS_PER_USER) errors.push(`Bạn đang có ${mine.length} yêu cầu chờ xử lý. Hãy đợi quản trị viên phản hồi trước khi gửi thêm.`);
  const key = `${cleanType}|${recipe?.id || ''}|${cleanTitle.toLowerCase()}`;
  if (mine.some(r => `${r.type}|${r.recipeId || ''}|${r.title.toLowerCase()}` === key)) errors.push('Bạn đã gửi yêu cầu này và nó đang chờ xử lý.');
  if (errors.length) return { errors };
  const now = Date.now();
  return {
    request: {
      id: makeId('req'),
      type: cleanType,
      title: cleanTitle || `${requestType(cleanType).label}: ${recipe?.title || ''}`.trim(),
      details: cleanDetails,
      recipeId: recipe?.id || null,
      recipeTitle: recipe?.title || '',
      userEmail: user.email,
      userName: user.name || user.email,
      status: 'pending',
      adminReply: '',
      createdAt: now,
      updatedAt: now
    }
  };
};

export const sanitizeRequests = list => (Array.isArray(list) ? list : [])
  .filter(r => r && typeof r.id === 'string' && typeof r.userEmail === 'string' && String(r.details ?? '').trim())
  .map(r => ({
    ...r,
    type: TYPE_IDS.includes(r.type) ? r.type : 'improve',
    status: STATUS_IDS.includes(r.status) ? r.status : 'pending',
    title: String(r.title ?? '').slice(0, REQUEST_TITLE_MAX + 40),
    details: String(r.details).slice(0, REQUEST_DETAILS_MAX),
    adminReply: String(r.adminReply ?? '').slice(0, REQUEST_DETAILS_MAX),
    createdAt: Number(r.createdAt) || 0,
    updatedAt: Number(r.updatedAt) || Number(r.createdAt) || 0
  }))
  .sort((a, b) => b.createdAt - a.createdAt)
  .slice(0, REQUEST_LIMIT);

/** Admin update: only status and reply change; a resolved/rejected request needs no reply but keeps one. */
export const applyRequestUpdate = (request, { status, adminReply }) => ({
  ...request,
  status: STATUS_IDS.includes(status) ? status : request.status,
  adminReply: adminReply == null ? request.adminReply : String(adminReply).trim().slice(0, REQUEST_DETAILS_MAX),
  updatedAt: Date.now()
});

export const countByStatus = list => Object.fromEntries(REQUEST_STATUSES.map(s => [s.id, (list || []).filter(r => r.status === s.id).length]));
