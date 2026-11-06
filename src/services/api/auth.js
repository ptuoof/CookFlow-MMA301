// Accounts on the CookFlow API. Users come back as
// { id, email, name, fullName, username, avatar, role, verified, locked, createdAt }.
// While no mail server is configured, responses carry the 6-digit code as `devCode` (development only).
import { apiRequest } from './client';

const BASE = '/api/auth';
const post = (path, body, auth = false) => apiRequest(`${BASE}${path}`, { method: 'POST', body, auth });

/** @returns {{ email, devCode? }} - the account must then be verified */
export const register = ({ name, email, password }) => post('/register', { name, email, password });

/** @returns {{ token, user }} */
export const verifyEmail = (email, code) => post('/verify-email', { email, code });

/** @returns {{ devCode? }} */
export const resendCode = email => post('/resend-code', { email });

/** @returns {{ token, user }}; throws ApiError code EMAIL_NOT_VERIFIED (data.email, data.devCode) / ACCOUNT_LOCKED */
export const login = (email, password) => post('/login', { email, password });

/** @returns {{ devCode? }} */
export const forgotPassword = email => post('/forgot-password', { email });

export const resetPassword = (email, code, newPassword) => post('/reset-password', { email, code, newPassword });

export const changePassword = (currentPassword, newPassword) =>
  apiRequest(`${BASE}/change-password`, { method: 'PUT', body: { currentPassword, newPassword } });

/** @returns {{ user, settings, hasSeenOnboarding }} */
export const fetchMe = () => apiRequest(`${BASE}/me`);

/** @returns user */
export const updateProfile = async ({ name, avatar }) =>
  (await apiRequest(`${BASE}/profile`, { method: 'PUT', body: { name, avatar } })).user;
