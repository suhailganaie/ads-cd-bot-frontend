// src/App.jsx
import React, { useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { BrowserRouter, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

// Lazy pages
const Home = React.lazy(() => import('./pages/Home/Home'));
const Earn = React.lazy(() => import('./pages/Earn/Earn'));
const Tasks = React.lazy(() => import('./pages/Tasks/Tasks'));
const Invite = React.lazy(() => import('./pages/Invite/Invite'));
const Withdraw = React.lazy(() => import('./pages/Withdraw/Withdraw'));
const AdminWithdraw = React.lazy(() => import('./pages/AdminWithdraw/AdminWithdraw')); // admin page

export default function App() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  const [authUser, setAuthUser] = useState(null);
  const [token, setToken] = useState(null);

  // Init Telegram Mini App viewport + safe area and expand
  useEffect(() => {
    try {
      tg?.ready?.();
      tg?.expand?.();

      const applyInsets = () => {
        const s = tg?.contentSafeAreaInset || tg?.safeAreaInset || { bottom: 0 };
        document.documentElement.style.setProperty('--tg-safe-bottom', String(s.bottom || 0) + 'px');
      };
      const applyHeight = () => {
        const h = tg?.viewportStableHeight || tg?.viewportHeight || 0;
        document.documentElement.style.setProperty('--tg-viewport-stable-height', h ? h + 'px' : '100vh');
      };

      applyInsets();
      applyHeight();

      tg?.onEvent?.('safeAreaChanged', applyInsets);
      tg?.onEvent?.('contentSafeAreaChanged', applyInsets);
      tg?.onEvent?.('viewportChanged', applyHeight);

      return () => {
        tg?.offEvent?.('safeAreaChanged', applyInsets);
        tg?.offEvent?.('contentSafeAreaChanged', applyInsets);
        tg?.offEvent?.('viewportChanged', applyHeight);
      };
    } catch {}
  }, [tg]); // Official TMA events keep layout correct. [web:4106][web:4430]

  // Lightweight login to learn admin role (server claim or allowlist)
  useEffect(() => {
    const API = import.meta.env?.VITE_API_BASE;
    if (!API) return;
    const u = tg?.initDataUnsafe?.user;
    if (!u?.id) return;

    (async () => {
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id: String(u.id), username: u.username || '' })
        });
        const data = await res.json().catch(() => ({}));
        setToken(data?.token || null);
        const claimAdmin = Boolean(data?.user?.admin);
        const allow = new Set((import.meta.env?.VITE_ADMIN_TIDS || '').split(',').map(s => s.trim()).filter(Boolean));
        const isAdmin = claimAdmin || allow.has(String(u.id));
        setAuthUser({ telegram_id: String(u.id), username: u.username || '', admin: isAdmin });
      } catch {
        setAuthUser(null);
      }
    })();
  }, [tg]); // Role gate for admin UI. [web:4422]

  const isAdmin = Boolean(authUser?.admin);

  // Simple guard for admin-only routes
  const AdminGuard = useCallback(
    ({ children }) => (isAdmin ? children : <Navigate to="/" replace />),
    [isAdmin]
  );

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-hero">
          <div className="hero-glow" />
          <div className="hero-content">
            <h1 className="brand-title">ADS BOT</h1>
            <p className="brand-subtitle">Ad Rewards Platform</p>
          </div>

          {/* Top-right Admin action (only for admins) */}
          {isAdmin && (
            <div className="hero-actions">
              <NavLink to="/admin/withdrawals" className="hero-action-link">
                Admin
              </NavLink>
            </div>
          )}
        </header>

        <Suspense fallback={<div className="skeleton-page">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/earn" element={<Earn />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route
              path="/admin/withdrawals"
              element={
                <AdminGuard>
                  <AdminWithdraw token={token} />
                </AdminGuard>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Bottom nav for everyone (no admin here) */}
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Home</span>
          </NavLink>
          <NavLink to="/earn" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Earn</span>
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Tasks</span>
          </NavLink>
          <NavLink to="/invite" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Invite</span>
          </NavLink>
          <NavLink to="/withdraw" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-dot" />
            <span className="nav-label">Withdraw</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}
