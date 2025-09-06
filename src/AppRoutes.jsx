import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const Earn = lazy(() => import('./pages/Earn/Earn'));
const Tasks = lazy(() => import('./pages/Tasks/Tasks'));

const Home = () => <div className="app"><h2>Home</h2><p>Welcome to ADS BOT.</p></div>;
const NotFound = () => <div className="app"><h2>404</h2><p>Page not found.</p></div>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
