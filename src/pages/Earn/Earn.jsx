import React, { useEffect, useRef, useState } from 'react';
import useTelegram from '../../hooks/useTelegram';

const API = import.meta.env.VITE_API_BASE;

export default function Earn() {
  const { tgUser } = useTelegram();

  const [cooldown, setCooldown] = useState(0);
  const timer = useRef();

  const [totalPoints, setTotalPoints] = useState(null);
  const [ptsLoading, setPtsLoading] = useState(true);
  const [ptsError, setPtsError] = useState(null);
  const [token, setToken] = useState(null);

  // Fetch token + points via login
  useEffect(() => {
    let alive = true;
    const telegram_id = tgUser?.id ? String(tgUser.id) : import.meta.env.VITE_DEV_TID || 'guest';
    const username = tgUser?.username || import.meta.env.VITE_DEV_USERNAME || 'guest';

    (async () => {
      try {
        setPtsLoading(true);
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id, username })
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!alive) return;
        setTotalPoints(data?.user?.points ?? 0);
        setToken(data?.token || null);
      } catch (e) {
        if (alive) setPtsError('Failed to load points');
      } finally {
        if (alive) setPtsLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [API, tgUser?.id, tgUser?.username]);

  const canShow = cooldown === 0;

  const startCooldown = () => {
    setCooldown(15);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // Helper to POST with Bearer
  const postWithAuth = async (path) => {
    if (!token) throw new Error('No token');
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  };

  // EARN (2) => /ads/main (+2)
  const popup = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309('pop');
      // optimistic +2
      setTotalPoints(p => (p ?? 0) + 2);
      await postWithAuth('/ads/main');
      startCooldown();
    } catch {
      // rollback if server rejects
      setTotalPoints(p => (p ?? 0) - 2);
    }
  };

  // EARN (1) => /ads/side (+1)
  const interstitial = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309();
      setTotalPoints(p => (p ?? 0) + 1);
      await postWithAuth('/ads/side');
      startCooldown();
    } catch {
      setTotalPoints(p => (p ?? 0) - 1);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3>🎯 Earn Points by Watching Ads</h3>
        <span className="muted">
          {ptsLoading ? 'Loading…' : ptsError ? '—' : `${totalPoints ?? 0} pts`}
        </span>
      </div>

      <div className="ad-buttons">
        <button className="ad-button main" onClick={popup} disabled={!canShow || !token}>
          EARN (2) {cooldown ? `• ${cooldown}s` : ''}
        </button>
        <button className="ad-button side" onClick={interstitial} disabled={!canShow || !token}>
          EARN (1) {cooldown ? `• ${cooldown}s` : ''}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 8 }}>
        Please wait 15 seconds between ads to prevent abuse.
      </p>
    </div>
  );
}
