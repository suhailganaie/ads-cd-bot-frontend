// src/AppRoutes.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Existing pages (kept)
const Home = lazy(() => import('./pages/Home/Home'));
const Earn = lazy(() => import('./pages/Earn/Earn'));
const Tasks = lazy(() => import('./pages/Tasks/Tasks'));

// NEW pages
const Lottery = lazy(() => import('./pages/Lottery/Lottery'));
const Invite = lazy(() => import('./pages/Invite/Invite'));

const NotFound = () => (
  <div className="app">
    <h2>404</h2>
    <p>Page not found.</p>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/tasks" element={<Tasks />} />
        {/* NEW routes */}
        <Route path="/lottery" element={<Lottery />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
