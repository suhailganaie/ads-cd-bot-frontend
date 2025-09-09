// src/pages/Home/Home.jsx
import React, { useEffect, useMemo, useState } from 'react';
import '../../styles/Home.css';

const API = import.meta.env.VITE_API_BASE;

export default function Home() {
  // Telegram context
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    try { tg?.expand?.(); tg?.ready?.(); } catch {}
  }, []); // Ensures full-height section for immersive hero. [web:3300]

  // Identity (aligns with Earn/Invite pages)
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const user = unsafe?.user || {};
  const telegram_id = user?.id ? String(user.id) : import.meta.env.VITE_DEV_TID || 'guest';
  const username = user?.username || import.meta.env.VITE_DEV_USERNAME || 'guest';
  const userId = user?.id ? String(user.id) : '';

  // Stats
  const [points, setPoints] = useState(null);
  const [invites, setInvites] = useState(null);
  const [loading, setLoading] = useState(true);

  // Header scheme for invite count (same as Invite.jsx)
  const inviteHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    return h;
  }, [userId]); // Same header used for /invite/count. [web:3346]

  // Fetch Balance and Invites on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // Balance via auth/login (same as Earn.jsx)
        const resLogin = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id, username })
        });
        const dataLogin = await resLogin.json().catch(() => ({}));
        if (!alive) return;
        setPoints(dataLogin?.user?.points ?? 0);

        // Invites via invite/count (same as Invite.jsx)
        const resInv = await fetch(`${API}/invite/count`, { headers: inviteHeaders });
        if (resInv.ok) {
          const dataInv = await resInv.json().catch(() => ({}));
          setInvites(typeof dataInv?.count === 'number' ? dataInv.count : 0);
        } else {
          setInvites(0);
        }
      } catch {
        if (alive) { setPoints(0); setInvites(0); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API, telegram_id, username, inviteHeaders]); // Standard React fetching with cleanup. [web:3868]

  return (
    <main className="home-page">
      <section className="panel depth depth-1">
        <header className="panel-head">
          <h2 className="panel-title">Welcome</h2>
          <p className="panel-subtitle">Turn time into tokens</p>
        </header>

        <div className="panel-body rich">
          <p>👋 Welcome to ADS BOT</p>
          <p>🎬 Watch ads to earn points instantly.</p>
          <p>👥 Invite friends to earn even more.</p>
          <p>💱 Convert points into the official token.</p>
          <p>🚀 Start earning in minutes — no crypto knowledge needed.</p>
        </div>

        <footer className="panel-foot">
          {/* Route CTAs */}
          <a href="#/earn" className="btn primary">Start earning</a>
          <a href="#/tasks" className="btn ghost">View tasks</a>
        </footer>
      </section>

      <section className="grid">
        <div className="tile depth depth-2">
          <h3 className="tile-title">Balance</h3>
          <p className="tile-kpi">
            <span>{loading || points == null ? '—' : points}</span> pts
          </p>
        </div>

        <div className="tile depth depth-2">
          <h3 className="tile-title">Invites</h3>
          <p className="tile-kpi">
            <span>{loading || invites == null ? '—' : invites}</span> friends
          </p>
        </div>
      </section>
    </main>
  );
}
