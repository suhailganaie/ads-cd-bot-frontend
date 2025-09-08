// src/hooks/useUser.js
import { useCallback, useEffect, useState } from 'react';
import { loginWithTelegram, refreshPoints } from '../services/user.service'; // Backend calls [web:2582]  
import { setToken } from '../services/apiClient'; // Bearer token store (in-memory) [web:2579]  

export default function useUser(initialTid, initialUsername) {
  const [user, setUser] = useState(null); // Current backend user { id, telegram_id, points } [web:2582]  
  const [points, setPoints] = useState(0); // Current points for display [web:2603]  
  const [loading, setLoading] = useState(true); // Loading state for UX [web:2772]  
  const [error, setError] = useState(null); // Error boundary for API calls [web:2752]  

  const login = useCallback(async (telegram_id, username) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginWithTelegram(telegram_id, username); // POST /auth/login [web:2582]  
      setUser(data?.user || null); // Store returned user in state [web:2582]  
      setPoints(data?.user?.points ?? 0); // Render user points [web:2603]  
      return data; // { token, user } for optional chaining [web:2582]  
    } catch (e) {
      setError(e.message || 'Login failed'); // Surface fetch/HTTP errors to UI [web:2752]  
      throw e;
    } finally {
      setLoading(false); // End of effect cycle [web:2772]  
    }
  }, []);

  // Auto-login when identity is passed (from Telegram or dev fallback)
  useEffect(() => {
    if (initialTid && initialUsername) {
      login(initialTid, initialUsername).catch(() => {}); // Ignore here; error state already set [web:2776]  
    } else {
      setLoading(false); // No identity available; keep UI responsive [web:2772]  
    }
  }, [initialTid, initialUsername, login]); // Stable dependencies for effect [web:2774]  

  const reloadPoints = useCallback(async (telegram_id, username) => {
    try {
      const p = await refreshPoints(telegram_id ?? user?.telegram_id, username); // Re-call login for authoritative points [web:2603]  
      setPoints(p);
      return p;
    } catch (e) {
      setError(e.message || 'Failed to refresh points'); // Notify UI on failure [web:2752]  
      throw e;
    }
  }, [user?.telegram_id]);

  const logout = useCallback(() => {
    setToken(null); // Clear in-memory Bearer token [web:2579]  
    setUser(null);
    setPoints(0);
  }, []);

  return { user, points, loading, error, login, reloadPoints, logout, setUser, setPoints }; // Hook API [web:2718]  
}
