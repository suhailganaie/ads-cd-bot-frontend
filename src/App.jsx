// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Link } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  // Telegram WebApp: guard to avoid runtime errors outside Telegram
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg && typeof tg.ready === 'function') tg.ready();
    if (tg && typeof tg.expand === 'function') tg.expand();
  }, []); // Guards prevent TypeErrors that can cause blank screens in production [web:1214]

  // Monetag SDK: guard the global to avoid crashes if not loaded
  useEffect(() => {
    const show = window?.show_9822309;
    if (typeof show === 'function') {
      try {
        show({
          type: 'inApp',
          inAppSettings: {
            frequency: 1,
            capping: 0.1,
            interval: 30,
            timeout: 5,
            everyPage: false
          }
        });
      } catch {}
    }
  }, []); // Defensive init per SDK behavior; prevents runtime errors when the global isn't ready [web:1101][web:1214]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>ADS BOT</h1>
          <p className="muted">Ad Rewards Platform</p>

          {/* Simple navigation to pages */}
          <nav className="card" style={{ marginTop: 12, padding: 10, display: 'flex', gap: 12 }}>
            <Link to="/" className="muted">Home</Link>
            <Link to="/earn" className="muted">Earn</Link>
            <Link to="/tasks" className="muted">Tasks</Link>
          </nav>
        </header>

        <section className="card balance-section">
          <h3>Welcome</h3>
          <p className="muted">
            Explore features from the menu. Auto interstitial ads may appear during usage.
          </p>
        </section>

        {/* Route outlet */}
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
