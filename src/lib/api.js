// src/lib/api.js

// 1) API base from Vite envs
// .env.development: VITE_API_BASE=/api
// .env.production:  VITE_API_BASE=https://ads-cd-bot-backend.onrender.com/api
const API = import.meta.env.VITE_API_BASE || '/api'; // fallback for dev

// 2) Simple in‑memory token store (front-end only)
let bearerToken = null;

/**
 * Set the Bearer token returned by login()
 * @param {string|null} token
 */
export function setToken(token) {
  bearerToken = token || null;
}

/**
 * Return default headers including auth when available
 */
function defaultHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
  };
}

/**
 * Low-level HTTP wrapper around fetch with:
 * - JSON serialization
 * - JSON parsing
 * - Error surfacing with status code and message text
 * - Optional extra headers
 */
async function http(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${API}${path}`;
  const opts = {
    method,
    headers: { ...defaultHeaders(), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'omit',
  };

  const res = await fetch(url, opts);
  const contentType = res.headers.get('content-type') || '';

  // Try to parse JSON if present
  const parseBody = async () => {
    if (contentType.includes('application/json')) {
      try { return await res.json(); } catch { return null; }
    }
    try { return await res.text(); } catch { return null; }
  };

  if (!res.ok) {
    const payload = await parseBody();
    const msg = typeof payload === 'string'
      ? payload
      : payload?.error || payload?.message || res.statusText;
    const err = new Error(`${res.status} ${res.statusText}${msg ? `: ${msg}` : ''}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return await parseBody();
}

/**
 * 3) High-level API functions mapped to backend routes
 */

// Auth: POST /api/auth/login
// Body: { telegram_id: string, username: string }
// Returns: { token, user: { id, telegram_id, points, ... } }
export async function login(telegram_id, username) {
  const data = await http('/auth/login', {
    method: 'POST',
    body: { telegram_id, username },
  });
  // Save token for protected routes
  if (data?.token) setToken(data.token);
  return data; // { token, user }
}

// Tasks: POST /api/tasks/complete  (Bearer required)
// Body: { task_id: string }  -> { ok: true, points_added: 20 } or 409 on duplicate
export function completeTask(task_id) {
  return http('/tasks/complete', {
    method: 'POST',
    body: { task_id },
  });
}

// Invite: POST /api/invite/claim
// Option A: header 'x-telegram-id': inviteeTid, body: { inviter_tid }
// Option B: body: { inviter_tid, invitee_tid }
export function inviteClaim({ inviter_tid, invitee_tid, useHeader = false }) {
  if (useHeader && invitee_tid) {
    return http('/invite/claim', {
      method: 'POST',
      headers: { 'x-telegram-id': String(invitee_tid) },
      body: { inviter_tid },
    });
  }
  return http('/invite/claim', {
    method: 'POST',
    body: { inviter_tid, invitee_tid },
  });
}

// Withdrawals: POST /api/withdrawals  (Bearer required)
// Body: { tokens: number } -> 201 Created with { ok:true, withdrawal:{...} }
export function createWithdrawal(tokens) {
  return http('/withdrawals', {
    method: 'POST',
    body: { tokens },
  });
}

/**
 * 4) Optional convenience utilities
 */

// Get current points by calling login again (authoritative refresh)
// Caution: login also upserts user; use sparingly if heavy.
export async function refreshPoints(telegram_id, username) {
  const data = await login(telegram_id, username);
  return data?.user?.points ?? 0;
}

// Clear token (e.g., on logout or token expiry)
export function clearToken() {
  bearerToken = null;
}
