import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  const [cooldown, setCooldown] = useState(0);       // seconds left before next ad
  const timerRef = useRef(null);

  // Telegram Mini App: ready + expand for full height
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []); // Telegram ready/expand is recommended for proper Mini App sizing [web:1202][web:894]

  // Initialize In‑App Interstitial (auto ads, no button)
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
  }, []); // Matches Monetag “In‑App Interstitial” initialization semantics [web:1198][web:1101]

  // Cooldown ticker (prevents spam: wait 15s between rewards)
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [cooldown]);

  const canShowAd = cooldown === 0;

  // Rewarded Interstitial (1 point)
  const onInterstitial = async () => {
    if (!canShowAd || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309(); // Rewarded Interstitial
      alert('Interstitial watched — +1 point (stubbed reward)');
      setCooldown(15);             // start 15s cooldown
    } catch (e) {
      // Promise may reject on error/no feed depending on SDK flags
      // No reward on failure
    }
  }; // Monetag: call without args or with type "end" for rewarded interstitial; resolves after ad ends [web:1101][web:1200]

  // Rewarded Popup (2 points)
  const onPopup = async () => {
    if (!canShowAd || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309('pop'); // must be invoked on user action
      alert('Popup completed — +2 points (stubbed reward)');
      setCooldown(15);                  // start 15s cooldown
    } catch (e) {
      // user closed early or error — no reward
    }
  }; // Monetag: 'pop' opens Rewarded Popup; handle success/error via Promise [web:1199][web:1101]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>ADS BOT</h1>
          <p className="muted">Ad Rewards Platform</p>
        </header>

        {/* Simple ad controls available on all pages for now */}
        <div className="features-section card" style={{ marginTop: 8 }}>
          <h3>🎯 Earn Points by Watching Ads</h3>
          <div className="ad-buttons">
            <button
              className="ad-button main"
              onClick={onPopup}
              disabled={!canShowAd}
              title={canShowAd ? 'Opens a rewarded popup' : `Wait ${cooldown}s`}
            >
              Main Ads (+2 points) {cooldown ? `• ${cooldown}s` : ''}
            </button>

            <button
              className="ad-button side"
              onClick={onInterstitial}
              disabled={!canShowAd}
              title={canShowAd ? 'Shows a rewarded interstitial' : `Wait ${cooldown}s`}
            >
              Side Ads (+1 point) {cooldown ? `• ${cooldown}s` : ''}
            </button>
          </div>

          <p className="muted" style={{ marginTop: 8 }}>
            In‑App Interstitials are enabled and may appear automatically while navigating the app.
          </p>
        </div>

        {/* The routed pages */}
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
