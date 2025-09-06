// src/App.jsx
import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Link } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg && typeof tg.ready === 'function') tg.ready();
    if (tg && typeof tg.expand === 'function') tg.expand();
  }, []); // Safe Telegram guards to avoid runtime errors/blank screens [1][13]

  useEffect(() => {
    const show = window?.show_9822309;
    if (typeof show === 'function') {
      try {
        const p = show({
          type: 'inApp',
          inAppSettings: { frequency: 1, capping: 1, interval: 3600, timeout: 50, everyPage: false }
        });
        if (p?.catch) p.catch(() => {});
      } catch {}
    }
  }, []); // Defensive init to avoid white screen from uncaught errors [1][16]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>ADS BOT</h1>
          <p className="muted">Ad Rewards Platform</p>
        </header>

        {/* Removed the Welcome card section here */}

        <Suspense fallback={<div className="muted">Loading…</div>}>
          <AppRoutes />
        </Suspense>

        <nav className="bottom-nav">
          <Link to="/" className="nav-item"><span className="nav-label">Home</span></Link>
          <Link to="/earn" className="nav-item"><span className="nav-label">Earn</span></Link>
          <Link to="/tasks" className="nav-item"><span className="nav-label">Tasks</span></Link>
          <Link to="/invite" className="nav-item"><span className="nav-label">Invite</span></Link>
        </nav>
      </div>
    </BrowserRouter>
  );
}
