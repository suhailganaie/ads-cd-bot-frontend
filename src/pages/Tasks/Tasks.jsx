// src/pages/Tasks.jsx
import React, { useEffect, useMemo, useState } from 'react';

// 1 hour in ms
const HOUR = 60 * 60 * 1000;

// Your deep links + 20 pts each
const CATALOG = [
  {
    id: 'x1',
    title: 'Follow Founder on X',
    type: 'x_follow',
    url: 'https://x.com/ganaie__suhail?t=fv8y2IqU9bZm9ROSmKDqrA&s=09',
    points: 20,
  },
  {
    id: 'x2',
    title: 'Follow ADS BOT on X',
    type: 'x_follow',
    url: 'https://x.com/Real_ADS_BOT?t=SQfsyLAm4AjmHjYBM0lDCw&s=09',
    points: 20,
  },
  {
    id: 'tg1',
    title: 'Join Telegram Channel',
    type: 'tg_channel',
    url: 'https://t.me/cryptoking_An0',
    points: 20,
  },
  {
    id: 'tg2',
    title: 'Join Telegram Group',
    type: 'tg_group',
    url: 'https://t.me/cryptoking_An',
    points: 20,
  },
  {
    id: 'wa1',
    title: 'Join WhatsApp Community',
    type: 'wa_group',
    url: 'https://chat.whatsapp.com/C1KNWYIoXaE99QZwSq5tpz?mode=ems_copy_t',
    points: 20,
  },
];

// LocalStorage helpers
const load = () => {
  try {
    const raw = localStorage.getItem('tasks:v3');
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed with defaults
  return CATALOG.map(t => ({ ...t, status: 'idle' }));
};

const save = (tasks) => {
  try { localStorage.setItem('tasks:v3', JSON.stringify(tasks)); } catch {}
};

export default function Tasks() {
  const [tasks, setTasks] = useState(load);

  // Persist state to localStorage on change
  useEffect(() => save(tasks), [tasks]); // Common and safe pattern with hooks + localStorage. [9]

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
  }, []); // Reconcile from storage on load. [9]

  // Background check: silently flip pending -> done when the window elapses
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setTasks(prev =>
        prev.map(t =>
          t.status === 'pending' && t.completeAt && now >= t.completeAt
            ? { ...t, status: 'done', doneAt: now }
            : t
        )
      );
    }, 15000);
    return () => clearInterval(id); // Proper cleanup for intervals. [21]
  }, []);

  const total = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.status === 'done' ? t.points : 0), 0),
    [tasks]
  );

  // Start hidden pending window and capture submitted handle
  const submitHandle = (taskId, handle) => {
    const now = Date.now();
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
  };

  const openExternal = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer'); // Safe new-tab open per MDN guidance. [20]
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
