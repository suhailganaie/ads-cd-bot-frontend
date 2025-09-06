import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  // Telegram WebApp guard
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg && typeof tg.ready === 'function') tg.ready();
    if (tg && typeof tg.expand === 'function') tg.expand();
  }, []); // avoid TypeErrors when opened outside Telegram [web:1214]

  // Global in‑app interstitial init (guarded)
  useEffect(() => {
    const show = window?.show_9822309;
    if (typeof show === 'function') {
      try {
        show({
          type: 'inApp',
          inAppSettings: {
            frequency: 2,
            capping: 0.1,
            interval: 30,
            timeout: 5,
            everyPage: false
          }
        });
      } catch {}
    }
  }, []); // prevent blank screen if SDK not ready [web:1101][web:1214]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>ADS BOT</h1>
          <p className="muted">Ad Rewards Platform</p>
        </header>

        <section className="card balance-section">
          <h3>Welcome</h3>
          <p className="muted">
            Explore features from the menu. Auto interstitial ads may appear during usage.
          </p>
        </section>

        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
