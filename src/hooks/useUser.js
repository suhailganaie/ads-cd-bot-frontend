import { useCallback, useEffect, useState } from 'react';
import { loginWithTelegram, refreshPoints } from '../services/user.service';
import { setToken } from '../services/apiClient';

export default function useUser(initialTid, initialUsername) {
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const login = useCallback(async (telegram_id, username) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginWithTelegram(telegram_id, username);
      setUser(data?.user || null);
      setPoints(data?.user?.points ?? 0);
      return data;
    } catch (e) {
      setError(e.message || 'Login failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []); // Custom hooks for auth and state is a common React pattern [web:2718][web:2601].

  useEffect(() => {
    if (initialTid && initialUsername) {
      login(initialTid, initialUsername).catch(() => {});
    } else {
      setLoading(false);
    }
  }, [initialTid, initialUsername, login]); // Auto-login on mount when Telegram identity is present [web:2601].

  const reloadPoints = useCallback(async (telegram_id, username) => {
    try {
      const p = await refreshPoints(telegram_id ?? user?.telegram_id, username);
      setPoints(p);
      return p;
    } catch (e) {
      setError(e.message || 'Failed to refresh points');
      throw e;
    }
  }, [user?.telegram_id]); // Fetching and updating state post-API aligns with React fetch guidance [web:2603].

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPoints(0);
  }, []); // Token cleared in memory only; persists nothing by default [web:2686].

  return { user, points, loading, error, login, reloadPoints, logout, setUser, setPoints };
}
