import React, { useEffect, useMemo, useState } from 'react';

// 1 hour in ms (cooldown/visibility window if needed)
const HOUR = 60 * 60 * 1000;

// Client catalog (server is source of truth for awarding)
const CATALOG = [
  { id: 'x1', title: 'Follow Founder on X', type: 'x_follow', url: 'https://x.com/ganaie__suhail?t=fv8y2IqU9bZm9ROSmKDqrA&s=09', points: 20 },
  { id: 'x2', title: 'Follow ADS BOT on X', type: 'x_follow', url: 'https://x.com/Real_ADS_BOT?t=SQfsyLAm4AjmHjYBM0lDCw&s=09', points: 20 },
  { id: 'tg1', title: 'Join Telegram Channel', type: 'tg_channel', url: 'https://t.me/cryptoking_An0', points: 20 },
  { id: 'tg2', title: 'Join Telegram Group', type: 'tg_group', url: 'https://t.me/cryptoking_An', points: 20 },
  { id: 'wa1', title: 'Join WhatsApp Community', type: 'wa_group', url: 'https://chat.whatsapp.com/C1KNWYIoXaE99QZwSq5tpz?mode=ems_copy_t', points: 20 },
];

// LocalStorage keys
const TASKS_KEY = 'tasks:v3';

// LocalStorage helpers
const load = () => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return CATALOG.map(t => ({ ...t, status: 'idle' }));
};
const save = (tasks) => { try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {} };

// Env and auth
const API = import.meta.env.VITE_API_BASE;

export default function Tasks() {
  const [tasks, setTasks] = useState(load);
  const [serverTotal, setServerTotal] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1) Login to get token and current total points
  useEffect(() => {
    let alive = true;
    const tg = window?.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user || null;
    const telegram_id = u?.id ? String(u.id) : import.meta.env.VITE_DEV_TID || 'guest';
    const username = u?.username || import.meta.env.VITE_DEV_USERNAME || 'guest';

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id, username })
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!alive) return;
        setToken(data?.token || null);
        setServerTotal(data?.user?.points ?? 0);
      } catch {
        // keep offline UI if needed
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [API]);

  // 2) Persist tasks UI state locally for snappy reloads
  useEffect(() => save(tasks), [tasks]);

  // 3) Helper: safe external open
  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer'); // safe window.open usage [web:2532][web:2537][web:2846]
  };

  // 4) Complete a task on the server with Bearer token
  const completeTask = async (taskId) => {
    if (!token) return;
    const res = await fetch(`${API}/tasks/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // standard Bearer header in fetch [web:2579][web:2672][web:2576]
      },
      body: JSON.stringify({ task_id: taskId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // If already completed, backend may return 409; keep UI as done to avoid re-submits
      throw new Error(data?.message || `Error ${res.status}`);
    }
    // Optionally data may include points_added; we’ll refetch total separately
    return data;
  };

  // 5) Submit-handler: optimistic UI, then server mutation; rollback on error
  const submitHandle = async (taskId) => {
    const now = Date.now();
    // Optimistic: mark pending -> done locally right away (or after a window)
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: 'pending', submittedAt: now, completeAt: now + HOUR } : t
      )
    );

    try {
      // Open the destination first (user action), then call server complete shortly after
      const t = tasks.find(x => x.id === taskId);
      if (t?.url) openExternal(t.url);

      // For simple UX, complete immediately; alternatively wait for completeAt
      await completeTask(taskId);

      // Mark as done locally
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, status: 'done', doneAt: Date.now() } : t
        )
      );

      // Refetch canonical total via login to avoid drift
      const tg = window?.Telegram?.WebApp;
      const u = tg?.initDataUnsafe?.user || null;
      const telegram_id = u?.id ? String(u.id) : import.meta.env.VITE_DEV_TID || 'guest';
      const username = u?.username || import.meta.env.VITE_DEV_USERNAME || 'guest';
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id, username })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerTotal(data?.user?.points ?? null);
      }
    } catch (e) {
      // Roll back to idle on failure
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, status: 'idle', submittedAt: undefined, completeAt: undefined } : t
        )
      );
    }
  };

  // 6) Local subtotal as quick fallback (UI only)
  const localSubtotal = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.status === 'done' ? t.points : 0), 0),
    [tasks]
  );

  const displayedTotal = serverTotal ?? localSubtotal;

  return (
    <div className="card">
      <h3>Tasks</h3>
      <p className="muted">Complete tasks to earn points. Each task is awarded once per user.</p>

      <ul className="task-list">
        {tasks.map(t => (
          <li key={t.id} className={`task ${t.status}`}>
            <div className="task-main">
              <span className="task-title">{t.title}</span>
              <span className="task-points">+{t.points} pts</span>
              {t.status === 'pending' && <span className="task-note">Submitting…</span>}
              {t.status === 'done' && <span className="task-done">Completed ✅</span>}
            </div>

            <div className="task-actions">
              <button onClick={() => openExternal(t.url)} disabled={t.status !== 'idle'}>
                Go
              </button>

              {t.status === 'idle' && (
                <button onClick={() => submitHandle(t.id)} disabled={!token}>
                  Submit
                </button>
              )}

              {t.status === 'pending' && <button disabled>Waiting…</button>}
            </div>
          </li>
        ))}
      </ul>

      <div className="task-total">Total: <strong>{displayedTotal ?? 0}</strong> pts</div>
      {loading && <div className="muted">Syncing with server…</div>}
    </div>
  );
}
