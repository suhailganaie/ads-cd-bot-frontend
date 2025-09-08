// src/lib/outbox.js
const OUTBOX_KEY = 'tasks:outbox:v1';

export const pushOutbox = (entry) => {
  const raw = localStorage.getItem(OUTBOX_KEY);
  const list = raw ? JSON.parse(raw) : [];
  list.push({ id: crypto.randomUUID(), ...entry });
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
  return list[list.length - 1].id;
};

export const readOutbox = () => {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; } catch { return []; }
};

export const removeFromOutbox = (id) => {
  const list = readOutbox().filter(e => e.id !== id);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
};

export const hasOutbox = () => readOutbox().length > 0;

