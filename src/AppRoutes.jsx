import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// All routed pages must be default exports
const Home = lazy(() => import('./pages/Home/Home'));
const Earn = lazy(() => import('./pages/Earn/Earn'));
const Tasks = lazy(() => import('./pages/Tasks/Tasks'));
const Invite = lazy(() => import('./pages/Invite/Invite'));
const Withdraw = lazy(() => import('./pages/Withdraw/Withdraw'));

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
        <Route path="/invite" element={<Invite />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
