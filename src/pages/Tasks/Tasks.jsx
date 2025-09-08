// src/pages/Tasks.jsx
import React, { useEffect, useMemo, useState } from 'react';

// 1 hour in ms
const HOUR = 60 * 60 * 1000;

// Your deep links (client defaults; server remains source of truth)
const CATALOG = [
  { id: 'x1', title: 'Follow Founder on X', type: 'x_follow', url: 'https://x.com/ganaie__suhail?t=fv8y2IqU9bZm9ROSmKDqrA&s=09', points: 20 },
  { id: 'x2', title: 'Follow ADS BOT on X', type: 'x_follow', url: 'https://x.com/Real_ADS_BOT?t=SQfsyLAm4AjmHjYBM0lDCw&s=09', points: 20 },
  { id: 'tg1', title: 'Join Telegram Channel', type: 'tg_channel', url: 'https://t.me/cryptoking_An0', points: 20 },
  { id: 'tg2', title: 'Join Telegram Group', type: 'tg_group', url: 'https://t.me/cryptoking_An', points: 20 },
  { id: 'wa1', title: 'Join WhatsApp Community', type: 'wa_group', url: 'https://chat.whatsapp.com/C1KNWYIoXaE99QZwSq5tpz?mode=ems_copy_t', points: 20 },
];

// LocalStorage keys
const TASKS_KEY = 'tasks:v3';
const OUTBOX_KEY = 'tasks:outbox:v1';

// LocalStorage helpers (persist UI state for fast loads)
const load = () => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return CATALOG.map(t => ({ ...t, status: 'idle' }));
};
const save = (tasks) => {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {}
};

// Outbox (small, localStorage-based; move to IndexedDB for scale)
const readOutbox = () => { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; } catch { return []; } };
const writeOutbox = (list) => { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch {} };
const pushOutbox = (entry) => {
  const list = readOutbox();
  const id = crypto.randomUUID();
  list.push({ id, ...entry });
  writeOutbox(list);
  return id;
};
const removeFromOutbox = (id) => writeOutbox(readOutbox().filter(e => e.id !== id));

// Network helper
const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

export default function Tasks() {
  const [tasks, setTasks] = useState(load);
  // serverTotal is the canonical points sum across tasks/ads/invites/bonuses
  const [serverTotal, setServerTotal] = useState(null);

  // Keep localStorage in sync for snappy reloads
  useEffect(() => save(tasks), [tasks]); // Persist client view; server still authoritative. [9]

  // Initial server hydration: fetch canonical tasks + total
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tasks', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        // Expect shape: { tasks: [...], total: number }
        if (cancelled) return;
        if (Array.isArray(data.tasks)) {
          setTasks(prev => {
            const byId = new Map(prev.map(t => [t.id, t]));
            data.tasks.forEach(s => {
              const existing = byId.get(s.id) || {};
              byId.set(s.id, { ...existing, ...s });
            });
            return Array.from(byId.values());
          });
        }
        if (typeof data.total === 'number') setServerTotal(data.total);
      } catch {
        // keep local fallback
      }
    })();
    return () => { cancelled = true; };
  }, []); // Hydrate canonical state and aggregate total. [9][7]

  // Finalize any already-expired pending tasks on mount (survives refresh)
  useEffect(() => {
    const now = Date.now();
    setTasks(prev =>
      prev.map(t =>
        t.status === 'pending' && t.completeAt && now >= t.completeAt
          ? { ...t, status: 'done', doneAt: now }
          : t
      )
    );
  }, []); // Local reconciliation on load (optimistic). [9]

  // Background check: flip pending -> done when window elapses; enqueue completion
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let toComplete = [];
      setTasks(prev =>
        prev.map(t => {
          if (t.status === 'pending' && t.completeAt && now >= t.completeAt) {
            toComplete.push({ taskId: t.id, doneAt: now });
            return { ...t, status: 'done', doneAt: now };
          }
          return t;
        })
      );
      if (toComplete.length) {
        toComplete.forEach(item => pushOutbox({ kind: 'complete', payload: item }));
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-tasks')).catch(() => {});
        }
      }
    }, 15000);
    return () => clearInterval(id);
  }, []); // Ensure completions are synced later as needed. [9]

  // Local subtotal as a fallback only
  const localSubtotal = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.status === 'done' ? t.points : 0), 0),
    [tasks]
  ); // Fallback subtotal for UX before server returns canonical total. [9]

  // Flush outbox helper: applies server responses and updates serverTotal
  const flushOutbox = async () => {
    const items = readOutbox();
    for (const item of items) {
      try {
        if (item.kind === 'submit') {
          // POST submit, expect server to return { taskId, status, completeAt, serverNow, total? }
          const resp = await postJson('/api/tasks/submit', item.payload);
          setTasks(prev => prev.map(t =>
            t.id === resp.taskId
              ? {
                  ...t,
                  status: resp.status ?? 'pending',
                  completeAt: resp.completeAt ?? t.completeAt,
                  submittedAt: resp.serverNow ?? t.submittedAt,
                }
              : t
          ));
          if (typeof resp.total === 'number') setServerTotal(resp.total);
        } else if (item.kind === 'complete') {
          // POST complete, expect { taskId, status:'done', pointsAwarded?, doneAt?, total? }
          const resp = await postJson('/api/tasks/complete', item.payload);
          setTasks(prev => prev.map(t =>
            t.id === resp.taskId
              ? {
                  ...t,
                  status: resp.status ?? 'done',
                  doneAt: resp.doneAt ?? t.doneAt,
                  points: typeof resp.pointsAwarded === 'number' ? resp.pointsAwarded : t.points,
                }
              : t
          ));
          if (typeof resp.total === 'number') setServerTotal(resp.total);
        }
        removeFromOutbox(item.id);
      } catch {
        // keep for retry
      }
    }
    // Optional: refetch canonical total after flush to ensure no drift
    try {
      const res = await fetch('/api/tasks/total', { credentials: 'include' });
      if (res.ok) {
        const { total } = await res.json();
        if (typeof total === 'number') setServerTotal(total);
      }
    } catch {}
  }; // Keep UI aligned with server truth after mutations. [7][9]

  // Flush on mount, online, and periodic retries; also listen for SW sync messages
  useEffect(() => {
    flushOutbox();
    const onOnline = () => flushOutbox();
    window.addEventListener('online', onOnline);
    const id = setInterval(() => flushOutbox(), 30000);
    return () => { window.removeEventListener('online', onOnline); clearInterval(id); };
  }, []); // Regular reconciliation to fetch authoritative totals. [7]

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e) => {
      if (e.data?.type === 'SYNC_REQUEST') flushOutbox();
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []); // Respond to Background Sync to refresh totals. [7]

  // Submit handler: optimistic + enqueue, server will return canonical total later
  const submitHandle = (taskId, handle) => {
    const now = Date.now();
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'pending', submittedAt: now, completeAt: now + HOUR, payload: { handle } }
          : t
      )
    );
    pushOutbox({ kind: 'submit', payload: { taskId, handle, submittedAt: now } });
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-tasks')).catch(() => {});
    }
  }; // Mutation enqueued; server will confirm and update totals. [7]

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }; // Standard safe open; unrelated to totals. [7]

  const placeholderFor = (t) =>
    t.type.startsWith('x_') ? 'X handle (without @)'
    : t.type.startsWith('tg_') ? 'Telegram @username'
    : 'WhatsApp name/number';

  // Choose serverTotal when available; fall back to localSubtotal to avoid “0”
  const displayedTotal = serverTotal ?? localSubtotal;

  return (
    <div className="card">
      <h3>Tasks</h3>
      <p className="muted">Daily tasks and offers will appear here.</p>

      <ul className="task-list">
        {tasks.map(t => (
          <li key={t.id} className={`task ${t.status}`}>
            <div className="task-main">
              <span className="task-title">{t.title}</span>
              <span className="task-points">+{t.points} pts</span>
              {t.status === 'pending' && <span className="task-note">Pending review</span>}
              {t.status === 'done' && <span className="task-done">Completed ✅</span>}
            </div>

            <div className="task-actions">
              <button onClick={() => openExternal(t.url)} disabled={t.status !== 'idle'}>
                Go
              </button>

              {t.status === 'idle' && (
                <form
                  className="task-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = new FormData(e.currentTarget).get('handle')?.toString().trim();
                    if (!value) return;
                    submitHandle(t.id, value);
                    e.currentTarget.reset();
                  }}
                >
                  <input name="handle" placeholder={placeholderFor(t)} />
                  <button type="submit">Submit</button>
                </form>
              )}

              {t.status === 'pending' && <button disabled>Waiting…</button>}
            </div>
          </li>
        ))}
      </ul>

      <div className="task-total">Total: <strong>{displayedTotal}</strong> pts</div>
      {/* Optionally show a hint when showing fallback subtotal */}
      {/* {serverTotal == null && <div className="muted">Syncing with server…</div>} */}
    </div>
  );
}
