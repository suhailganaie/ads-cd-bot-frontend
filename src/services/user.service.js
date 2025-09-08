// src/services/user.service.js
import { post, setToken } from './apiClient';

// POST /api/auth/login -> { token, user }
export async function loginWithTelegram(telegram_id, username) {
  const resp = await post('/auth/login', { telegram_id, username });
  if (resp?.token) setToken(resp.token);
  return resp; // { token, user }
}

// Refresh and return current points (authoritative)
export async function refreshPoints(telegram_id, username) {
  const data = await loginWithTelegram(telegram_id, username);
  return data?.user?.points ?? 0;
}
