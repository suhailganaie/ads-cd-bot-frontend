// src/pages/Earn/Earn.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../../styles/earn.css';

const API = import.meta.env.VITE_API_BASE;

export default function Earn() {
  // Stabilize Telegram webview and fill height
  useEffect(() => { try { window?.Telegram?.WebApp?.ready?.(); window?.Telegram?.WebApp?.expand?.(); } catch {} }, []); // stable viewport [24]

  const tg = window?.Telegram?.WebApp;
  const u = tg?.initDataUnsafe?.user || null;

  const [cooldown, setCooldown] = useState(0);
  const timer = useRef();

  const [totalPoints, setTotalPoints] = useState(null);
  const [ptsLoading, setPtsLoading] = useState(true);
  const [ptsError, setPtsError] = useState(null);
  const [token, setToken] = useState(null);

  // Login + points
  useEffect(() => {
    let alive = true;
    const telegram_id = u?.id ? String(u.id) : import.meta.env.VITE_DEV_TID || 'guest';
    const username = u?.username || import.meta.env.VITE_DEV_USERNAME || 'guest';
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
      } catch {
        if (alive) setPtsError('Failed to load points');
      } finally {
        if (alive) setPtsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API, u?.id, u?.username]); // login flow [25]

  const canShow = cooldown === 0;
  const startCooldown = () => {
    setCooldown(15);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(timer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const postWithAuth = async (path) => {
    if (!token) throw new Error('No token');
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  }; // Bearer token header pattern. [26]

  // Existing network (libtl)
  const popup = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309('pop');
      setTotalPoints((p) => (p ?? 0) + 2);
      await postWithAuth('/ads/main');
      startCooldown();
    } catch {
      setTotalPoints((p) => (p ?? 0) - 2);
    }
  };

  const interstitial = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309();
      setTotalPoints((p) => (p ?? 0) + 1);
      await postWithAuth('/ads/side');
      startCooldown();
    } catch {
      setTotalPoints((p) => (p ?? 0) - 1);
    }
  };

  // Adexium partner
  const runAdexium = useCallback(async ({ wid, format, rewardPath, rewardDelta, fullScreen = false }) => {
    if (!canShow || !window.AdexiumWidget) return;
    return new Promise((resolve) => {
      try {
        const adx = new window.AdexiumWidget({
          wid,
          adFormat: format,
          isFullScreen: fullScreen || false,
          // debug: true,
        });

        const onReceived = (ad) => adx.displayAd(ad);
        const onCompleted = async () => {
          cleanup();
          setTotalPoints((p) => (p ?? 0) + rewardDelta);
          try { await postWithAuth(rewardPath); } catch { setTotalPoints((p) => (p ?? 0) - rewardDelta); }
          startCooldown();
          resolve('done');
        };
        const onNoAd = () => { cleanup(); resolve('noAd'); };
        const cleanup = () => {
          adx.off?.('adReceived', onReceived);
          adx.off?.('adPlaybackCompleted', onCompleted);
          adx.off?.('noAdFound', onNoAd);
        };
        adx.on?.('adReceived', onReceived);
        adx.on?.('adPlaybackCompleted', onCompleted);
        adx.on?.('noAdFound', onNoAd);
        adx.requestAd?.(format);
      } catch {
        resolve();
      }
    });
  }, [canShow, postWithAuth]); // event-based reward [4]

  const adxMain = () => runAdexium({
    wid: 'b6509d9f-3faf-4e19-af77-ae292cde7eb6',
    format: 'interstitial',
    rewardPath: '/ads/main',
    rewardDelta: 2,
    fullScreen: true,
  });

  const adxSide = () => runAdexium({
    wid: '523e4b9e-f0a7-43c2-8e74-285d4d42bdc9',
    format: 'push-like',
    rewardPath: '/ads/side',
    rewardDelta: 1,
  });

  return (
    <>
      <div className="earn-card">
        <div className="earn-head">
          <h3 className="earn-title">Watch ads to earn</h3>
          <span className="earn-points">{ptsLoading ? '…' : ptsError ? '—' : `${totalPoints ?? 0} pts`}</span>
        </div>

        <div className="earn-stack">
          {/* Rename all to “Watch ad” with reward badges; large capsule buttons */}
          <button className="earn-btn primary" onClick={popup} disabled={!canShow || !token}>
            Watch ad • +2 {cooldown ? `• ${cooldown}s` : ''}
          </button>

          <button className="earn-btn ghost" onClick={interstitial} disabled={!canShow || !token}>
            Watch ad • +1 {cooldown ? `• ${cooldown}s` : ''}
          </button>

          <button className="earn-btn primary" onClick={adxMain} disabled={!canShow || !token}>
            Watch ad • +2 (A) {cooldown ? `• ${cooldown}s` : ''}
          </button>

          <button className="earn-btn ghost" onClick={adxSide} disabled={!canShow || !token}>
            Watch ad • +1 (A) {cooldown ? `• ${cooldown}s` : ''}
          </button>
        </div>

        <p className="earn-hint">Please wait 15 seconds between ads to prevent abuse.</p>
      </div>

      {/* Safe-area spacer to clear fixed bottom nav */}
      <div className="page-end-spacer" />
    </>
  );
}
