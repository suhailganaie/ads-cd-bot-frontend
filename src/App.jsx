import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  // Telegram Mini App: ready + expand for correct viewport inside Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []); // Recommended to ensure proper sizing within Telegram client [web:1202][web:894]

  // Global In‑App Interstitial initializer (auto ads, no buttons)
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
    } catch {
      // ignore if SDK not ready; this format is passive and non-blocking
    }
  }, []); // Mirrors Monetag’s in‑app interstitial setup for Mini Apps [web:1198][web:1101]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>ADS BOT</h1>
          <p className="muted">Ad Rewards Platform</p>
        </header>

        {/* Home content (no ad action buttons here) */}
        <section className="card balance-section">
          <h3>Welcome</h3>
          <p className="muted">
            Explore features from the menu. Auto interstitial ads may appear during usage.
          </p>
        </section>

        {/* Routed pages (e.g., /earn, /tasks) render below */}
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
