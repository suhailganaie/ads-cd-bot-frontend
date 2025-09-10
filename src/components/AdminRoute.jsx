// src/components/AdminRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';

export default function AdminRoute({ user, children }) {
  const loc = useLocation();
  const claimAdmin = Boolean(user?.admin);
  const allow = new Set((import.meta.env.VITE_ADMIN_TIDS||'').split(',').map(s=>s.trim()).filter(Boolean));
  const isAllowed = claimAdmin || (user?.telegram_id && allow.has(String(user.telegram_id)));
  if (!isAllowed) return <Navigate to="/" state={{ from: loc }} replace />;
  return children;
}
