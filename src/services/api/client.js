// HTTP client for the CookFlow REST API (repo SDN302/CookFlow, see docs/FE_INTEGRATION.md there).
// Every error response of the API has the same shape:
//   { success: false, message: '<tiếng Việt, hiển thị được>', code?: 'EMAIL_NOT_VERIFIED' | ..., errors?: [...] }
// so screens can show `error.message` directly.
import { Platform } from 'react-native';

// EXPO_PUBLIC_API_URL wins (e.g. http://192.168.1.10:9999 for a real phone on the same Wi-Fi).
// Defaults: the Android emulator reaches the computer at 10.0.2.2; iOS simulator / web use localhost.
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:9999' : 'http://localhost:9999';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL).replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 15000;

let authToken = null;
/** Sets the JWT sent with every request (null after sign-out). Storage is the caller's job. */
export const setAuthToken = token => {
  authToken = token || null;
};
export const getAuthToken = () => authToken;

// Called when the server says the session is over (token expired/invalid, account locked or deleted).
// AuthContext registers a handler that signs the user out.
const SESSION_END_CODES = new Set(['TOKEN_MISSING', 'TOKEN_INVALID', 'TOKEN_EXPIRED', 'ACCOUNT_LOCKED', 'EMAIL_NOT_VERIFIED']);
let sessionEndHandler = null;
export const setSessionEndHandler = handler => {
  sessionEndHandler = handler;
};

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, errors = null, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.data = data;
  }
}

/**
 * Calls the API and returns the parsed JSON body, or throws an ApiError.
 * @param {string} path  e.g. '/api/shopping/abc'
 * @param {{ method?: string, body?: object|FormData, query?: object, auth?: boolean }} options
 */
export const apiRequest = async (path, { method = 'GET', body, query, auth = true } = {}) => {
  const qs = query
    ? '?' + Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    : '';
  const headers = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_URL}${path}${qs === '?' ? '' : qs}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    throw new ApiError(
      error?.name === 'AbortError' ? 'Máy chủ CookFlow phản hồi quá lâu. Hãy thử lại.' : 'Không kết nối được máy chủ CookFlow. Kiểm tra mạng hoặc địa chỉ máy chủ.',
      { code: 'NETWORK_ERROR' }
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok || data?.success === false) {
    // A signed-in request rejected because the session is over -> sign out everywhere
    if (auth && authToken && SESSION_END_CODES.has(data?.code) && sessionEndHandler) {
      sessionEndHandler({ code: data.code, message: data.message });
    }
    throw new ApiError(data?.message || data?.error?.message || `Lỗi máy chủ (${response.status})`, {
      status: response.status,
      code: data?.code || null,
      errors: data?.errors || null,
      data
    });
  }
  return data;
};
