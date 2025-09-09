// src/App.jsx
import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, NavLink } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    try {
      if (tg && typeof tg.ready === 'function') tg.ready();
      if (tg && typeof tg.expand === 'function') tg.expand();
    } catch {}
  }, []); // Call ready/expand early for a native feel in Telegram. [web:3300]

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
  }, []); // Defensive wrapper to avoid uncaught errors interrupting render. [web:3461]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>ADS BOT</h1>
          <p className="muted">Ad Rewards Platform</p>
        </header>

        <Suspense fallback={<div className="muted">Loading…</div>}>
          <AppRoutes />
        </Suspense>

        <nav className="bottom-nav">
          <NavLink to="/" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/earn" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-label">Earn</span>
          </NavLink>
          <NavLink to="/tasks" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-label">Tasks</span>
          </NavLink>
          <NavLink to="/invite" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-label">Invite</span>
          </NavLink>
          <NavLink to="/withdraw" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-label">Withdraw</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}
