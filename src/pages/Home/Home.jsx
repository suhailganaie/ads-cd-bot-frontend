// src/pages/Home/Home.jsx
import React, { useEffect } from 'react';
import './Home.css';

export default function Home() {
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    try { tg?.expand?.(); tg?.ready?.(); } catch {}
  }, []); // Ensures full-height section for immersive hero. [9]

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
          <a href="#/earn" className="btn primary">Start earning</a>
          <a href="#/tasks" className="btn ghost">View tasks</a>
        </footer>
      </section>

      <section className="grid">
        <div className="tile depth depth-2">
          <h3 className="tile-title">Balance</h3>
          <p className="tile-kpi"><span>0</span> pts</p>
        </div>
        <div className="tile depth depth-2">
          <h3 className="tile-title">Invites</h3>
          <p className="tile-kpi"><span>0</span> friends</p>
        </div>
      </section>
    </main>
  );
}
