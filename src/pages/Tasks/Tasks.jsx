// src/pages/Tasks/Tasks.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../../styles/tasks.css'; // component-only styles; global layout from App.css [web:4251]

const HOUR = 60 * 60 * 1000;
const CATALOG = [
  { id: 'x1', title: 'Follow Founder on X', type: 'x_follow', url: 'https://x.com/ganaie__suhail?t=fv8y2IqU9bZm9ROSmKDqrA&s=09', points: 20 },
  { id: 'x2', title: 'Follow ADS BOT on X', type: 'x_follow', url: 'https://x.com/Real_ADS_BOT?t=SQfsyLAm4AjmHjYBM0lDCw&s=09', points: 20 },
  { id: 'tg1', title: 'Join Telegram Channel', type: 'tg_channel', url: 'https://t.me/cryptoking_An0', points: 20 },
  { id: 'tg2', title: 'Join Telegram Group', type: 'tg_group', url: 'https://t.me/cryptoking_An', points: 20 },
  { id: 'wa1', title: 'Join WhatsApp Community', type: 'wa_group', url: 'https://chat.whatsapp.com/C1KNWYIoXaE99QZwSq5tpz?mode=ems_copy_t', points: 20 },
];

const TASKS_KEY = 'tasks:v3';
const API = import.meta.env?.VITE_API_BASE || '';

const load = () => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return CATALOG.map(t => ({ ...t, status: 'idle' }));
};
const save = (tasks) => { try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch {} };

export default function Tasks() {
  // Telegram ready/expand for stable viewport
  useEffect(() => { try { window?.Telegram?.WebApp?.ready?.(); window?.Telegram?.WebApp?.expand?.(); } catch {} }, []); // stabilize webview [web:4106]

  const [tasks, setTasks] = useState(load);
  const [serverTotal, setServerTotal] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login to obtain Bearer token and current points
  useEffect(() => {
    let alive = true;
    const tg = window?.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user || null;
    const telegram_id = u?.id ? String(u.id) : import.meta.env?.VITE_DEV_TID || 'guest';
    const username = u?.username || import.meta.env?.VITE_DEV_USERNAME || 'guest';

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id, username }),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        setToken(data?.token || null);
        setServerTotal(data?.user?.points ?? 0);
      } catch {
        // keep offline UI
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  // Persist local UI state
  useEffect(() => save(tasks), [tasks]);

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer'); // safe external open [web:4281]
  };

  const completeTask = useCallback(async (taskId) => {
    if (!token) throw new Error('no_token');
    const res = await fetch(`${API}/tasks/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task_id: taskId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
    return data;
  }, [token]);

  const refetchPoints = useCallback(async () => {
    const tg = window?.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user || null;
    const telegram_id = u?.id ? String(u.id) : import.meta.env?.VITE_DEV_TID || 'guest';
    const username = u?.username || import.meta.env?.VITE_DEV_USERNAME || 'guest';
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id, username }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setServerTotal(data?.user?.points ?? null);
    }
  }, []);

  const submitHandle = async (taskId) => {
    const now = Date.now();
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, status: 'pending', submittedAt: now, completeAt: now + HOUR }
      : t
    ));

    try {
      const t = tasks.find(x => x.id === taskId);
      if (t?.url) openExternal(t.url);

      await completeTask(taskId);

      setTasks(prev => prev.map(t => t.id === taskId
        ? { ...t, status: 'done', doneAt: Date.now() }
        : t
      ));

      await refetchPoints();
    } catch {
      setTasks(prev => prev.map(t => t.id === taskId
        ? { ...t, status: 'idle', submittedAt: undefined, completeAt: undefined }
        : t
      ));
    }
  };

  const localSubtotal = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.status === 'done' ? t.points : 0), 0),
    [tasks]
  );
  const displayedTotal = serverTotal ?? localSubtotal;

  return (
    <>
      <div className="tasks-card">
        <h3 className="tasks-title">Tasks</h3>
        <p className="tasks-sub">Complete tasks to earn points. Each task is awarded once.</p>

        <ul className="task-list">
          {tasks.map(t => (
            <li key={t.id} className={`task ${t.status}`}>
              <div className="task-main">
                <span className="task-title">{t.title}</span>
                <span className="task-points">+{t.points} pts</span>
              </div>

              <div className="task-meta">
                {t.status === 'pending' && <span className="task-badge pending">Submitting…</span>}
                {t.status === 'done' && <span className="task-badge done">Completed ✅</span>}
              </div>

              <div className="task-actions">
                <button className="btn ghost" onClick={() => openExternal(t.url)} disabled={t.status !== 'idle'}>
                  Go
                </button>
                {t.status === 'idle' && (
                  <button className="btn primary" onClick={() => submitHandle(t.id)} disabled={!token}>
                    Submit
                  </button>
                )}
                {t.status === 'pending' && <button className="btn" disabled>Waiting…</button>}
                {t.status === 'done' && <button className="btn" disabled>Done</button>}
              </div>
            </li>
          ))}
        </ul>

        <div className="task-total">
          Total: <strong>{displayedTotal ?? 0}</strong> pts
          {loading && <span className="tasks-sync"> Syncing…</span>}
        </div>
      </div>

      {/* Safe-area spacer to clear fixed bottom nav */}
      <div className="page-end-spacer" />
    </>
  );
}
