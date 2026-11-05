// Signed-in user's settings / personal data, and admin user management.
import { apiRequest } from './client';

const BASE = '/api/users';

// ----- Me -----
/** @returns {{ settings, hasSeenOnboarding }} */
export const fetchSettings = () => apiRequest(`${BASE}/me/settings`);

/** Partial update; also accepts hasSeenOnboarding. @returns {{ settings, hasSeenOnboarding }} */
export const updateSettings = patch => apiRequest(`${BASE}/me/settings`, { method: 'PUT', body: patch });

/** @returns the backup object ({ format: 'cookflow-backup', version, exportedAt, data }) */
export const exportData = async () => (await apiRequest(`${BASE}/me/data`)).backup;

/** Replaces all personal data. @returns summary { recipes, favorites, shopping, history, meals } */
export const importData = async backup => (await apiRequest(`${BASE}/me/data/import`, { method: 'POST', body: backup })).summary;

export const resetData = () => apiRequest(`${BASE}/me/data`, { method: 'DELETE' });

// ----- Admin -----
/** @returns {{ users, stats }} */
export const fetchUsers = () => apiRequest(BASE);

/** Creates ({ id } absent) or edits a user. @returns user */
export const saveUser = async ({ id, email, name, role, verified, locked, password }) => {
  const body = { email, name, role, verified, locked, ...(password ? { password } : {}) };
  const data = id
    ? await apiRequest(`${BASE}/${id}`, { method: 'PUT', body })
    : await apiRequest(BASE, { method: 'POST', body });
  return data.user;
};

export const deleteUser = id => apiRequest(`${BASE}/${id}`, { method: 'DELETE' });

/** Admin overview numbers. */
export const fetchAdminStats = async () => (await apiRequest('/api/admin/stats')).stats;
