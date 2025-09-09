// src/App.jsx
import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, NavLink } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import './styles/App.css';

export default function App() {
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    try {
      tg?.ready?.();
      tg?.expand?.();
      // react to viewport/safe area so bottom nav never overlaps content
      const onViewport = () => {
        document.documentElement.style.setProperty(
          '--vh-stable',
          getComputedStyle(document.documentElement).getPropertyValue('--tg-viewport-stable-height') || '100vh'
        );
      };
      tg?.onEvent?.('viewport_changed', onViewport);
      tg?.onEvent?.('content_safe_area_changed', onViewport);
      onViewport();
      return () => {
        tg?.offEvent?.('viewport_changed', onViewport);
        tg?.offEvent?.('content_safe_area_changed', onViewport);
      };
    } catch {}
  }, []); // Use TMA viewport/safe-area events to keep bottom nav from covering CTAs. [5][7]

  // Optional: initialize your passive ad network once; never block UI
  useEffect(() => {
    const show = window?.show_9822309;
    if (typeof show === 'function') {
      try {
        const p = show({
          type: 'inApp',
          inAppSettings: { frequency: 1, capping: 1, interval: 3600, timeout: 50, everyPage: false }
        });
        p?.catch?.(() => {});
      } catch {}
    }
  }, []); // Keep ads non-blocking to maintain UX quality. [8]

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-hero">
          <div className="hero-glow" />
          <div className="hero-content">
            <h1 className="brand-title">ADS BOT</h1>
            <p className="brand-subtitle">Ad Rewards Platform</p>
          </div>
        </header>

        <Suspense fallback={<div className="skeleton-page" />}>
          <AppRoutes />
        </Suspense>

        <nav className="bottom-nav">
          <NavLink to="/" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/earn" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Earn</span>
          </NavLink>
          <NavLink to="/tasks" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Tasks</span>
          </NavLink>
          <NavLink to="/invite" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Invite</span>
          </NavLink>
          <NavLink to="/withdraw" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Withdraw</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}
