// src/lib/sync.js
import { readOutbox, removeFromOutbox } from './outbox';

const send = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

export const flushOutbox = async (applyServer) => {
  const items = readOutbox();
  for (const item of items) {
    try {
      if (item.kind === 'submit') {
        const resp = await send('/api/tasks/submit', item.payload);
        applyServer('submit', resp); // e.g., set pending window from server
      } else if (item.kind === 'complete') {
        const resp = await send('/api/tasks/complete', item.payload);
        applyServer('complete', resp); // e.g., set status done and points
      }
      removeFromOutbox(item.id);
    } catch {
      // keep in outbox; retry later
    }
  }
};
