// Recipe requests & reports on the CookFlow API. Requests:
// { id, type, title, details, recipeId, recipeTitle, userId, userEmail, userName, status, adminReply, createdAt, updatedAt } (ms)
import { apiRequest } from './client';

const BASE = '/api/requests';

/** Admins get every request, users their own. */
export const fetchRequests = async isAdmin => (await apiRequest(isAdmin ? BASE : `${BASE}/mine`)).requests;

export const createRequest = async ({ type, title, details, recipeId }) =>
  (await apiRequest(BASE, { method: 'POST', body: { type, title, details, recipeId } })).request;

/** Admin: { status?, adminReply? } */
export const updateRequest = async (id, patch) => (await apiRequest(`${BASE}/${id}`, { method: 'PATCH', body: patch })).request;

export const deleteRequest = id => apiRequest(`${BASE}/${id}`, { method: 'DELETE' });
