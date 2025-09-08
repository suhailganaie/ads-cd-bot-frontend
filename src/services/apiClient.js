
// src/services/apiClient.js

// Base URL from Vite envs:
// .env.development => VITE_API_BASE=/api  (uses Vite dev proxy)
// .env.production  => VITE_API_BASE=https://ads-cd-bot-backend.onrender.com/api
const API = import.meta.env.VITE_API_BASE || '/api';

// In‑memory token (not persisted). Re-login on mount or persist elsewhere if needed.
let bearerToken = null;

export function setToken(token) { bearerToken = token || null; }
export function clearToken() { bearerToken = null; }
export function getToken() { return bearerToken; }

function defaultHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    ...extra,
  };
}

async function parse(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return null; }
  }
  try { return await res.text(); } catch { return null; }
}

export async function http(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: defaultHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'omit',
  });

  const data = await parse(res);

  if (!res.ok) {
    const msg = typeof data === 'string'
      ? data
      : data?.error || data?.message || res.statusText;
    const err = new Error(`${res.status} ${res.statusText}${msg ? `: ${msg}` : ''}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

// Convenience methods
export const get = (p, o = {}) => http(p, { ...o, method: 'GET' });
export const post = (p, body, o = {}) => http(p, { ...o, method: 'POST', body });
export const del = (p, o = {}) => http(p, { ...o, method: 'DELETE' });
