import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []); // Telegram sizing inside Mini Apps

  useEffect(() => {
    if (typeof window.show_9822309 !== 'function') return;
    try {
      window.show_9822309({
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
  }, []); // Global in‑app interstitial init

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
