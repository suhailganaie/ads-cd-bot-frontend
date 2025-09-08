// src/pages/Tasks.jsx
import React, { useEffect, useMemo, useState } from 'react';

// 1 hour in ms
const HOUR = 60 * 60 * 1000;

// Your deep links + 20 pts each (client defaults; server is source of truth)
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

// LocalStorage helpers
const load = () => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed with defaults
  return CATALOG.map(t => ({ ...t, status: 'idle' }));
};

const save = (tasks) => {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {}
};

// Simple outbox (use IndexedDB for scale)
const readOutbox = () => {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || []; } catch { return []; }
};
const writeOutbox = (list) => {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch {}
};
const pushOutbox = (entry) => {
  const list = readOutbox();
  const id = crypto.randomUUID();
  list.push({ id, ...entry });
  writeOutbox(list);
  return id;
};
const removeFromOutbox = (id) => {
  writeOutbox(readOutbox().filter(e => e.id !== id));
};

// Network helpers
const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};

export default function Tasks() {
  const [tasks, setTasks] = useState(load);

  // Persist state to localStorage on change
  useEffect(() => save(tasks), [tasks]); // Persist tasks to localStorage for instant UX. [20]

  // Hydrate from server on first load and reconcile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tasks', { credentials: 'include' });
        if (!res.ok) return;
        const serverTasks = await res.json();
        if (cancelled) return;
        setTasks(prev => {
          const byId = new Map(prev.map(t => [t.id, t]));
          serverTasks.forEach(s => {
            const existing = byId.get(s.id) || {};
            // Prefer server truth for status/points/timestamps
            byId.set(s.id, { ...existing, ...s });
          });
          // Include any client-only tasks not on server (optional)
          return Array.from(byId.values());
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []); // Server hydration for canonical status/points. [19]

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
  }, []); // Reconcile pending->done on load. [20]

  // Background check: silently flip pending -> done when the window elapses
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
      // Enqueue completes for server reconciliation
      if (toComplete.length) {
        toComplete.forEach(item => pushOutbox({ kind: 'complete', payload: item }));
        // Try to schedule a background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready
            .then(reg => reg.sync.register('sync-tasks'))
            .catch(() => {});
        }
      }
    }, 15000);
    return () => clearInterval(id); // Cleanup interval. [20]
  }, []);

  // Compute total by done tasks (client view; server still authoritative)
  const total = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.status === 'done' ? t.points : 0), 0),
    [tasks]
  );

  // Outbox flusher (called from SW message, online, and interval)
  const flushOutbox = async () => {
    const items = readOutbox();
    for (const item of items) {
      try {
        if (item.kind === 'submit') {
          const resp = await postJson('/api/tasks/submit', item.payload);
          // Server can adjust window/timestamps
          setTasks(prev => prev.map(t =>
            t.id === resp.taskId
              ? { ...t, status: 'pending', completeAt: resp.completeAt ?? t.completeAt, submittedAt: resp.serverNow ?? t.submittedAt }
              : t
          ));
        } else if (item.kind === 'complete') {
          const resp = await postJson('/api/tasks/complete', item.payload);
          setTasks(prev => prev.map(t =>
            t.id === resp.taskId
              ? { ...t, status: 'done', doneAt: resp.doneAt ?? t.doneAt, points: resp.pointsAwarded ?? t.points }
              : t
          ));
        }
        removeFromOutbox(item.id);
      } catch {
        // keep for retry
      }
    }
  };

  // Flush on mount, online events, and periodic retries
  useEffect(() => {
    flushOutbox();
    const onOnline = () => flushOutbox();
    window.addEventListener('online', onOnline);
    const id = setInterval(() => flushOutbox(), 30000);
    return () => { window.removeEventListener('online', onOnline); clearInterval(id); };
  }, []); // Retry loop + online trigger. [18][19]

  // SW message listener to trigger flush when Background Sync fires
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e) => {
      if (e.data?.type === 'SYNC_REQUEST') {
        flushOutbox();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []); // Respond to sync events. [18][19]

  // Start hidden pending window and capture submitted handle
  const submitHandle = (taskId, handle) => {
    const now = Date.now();
    // Optimistic UI
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'pending',
              submittedAt: now,
              completeAt: now + HOUR,
              payload: { handle },
            }
          : t
      )
    );
    // Enqueue mutation for server
    pushOutbox({ kind: 'submit', payload: { taskId, handle, submittedAt: now } });
    // Try to schedule a background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(reg => reg.sync.register('sync-tasks'))
        .catch(() => {});
    }
  };

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer'); // Safe new-tab open. [19]
  };

  const placeholderFor = (t) =>
    t.type.startsWith('x_') ? 'X handle (without @)'
    : t.type.startsWith('tg_') ? 'Telegram @username'
    : 'WhatsApp name/number';

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

      <div className="task-total">Total: {total} pts</div>
    </div>
  );
}
