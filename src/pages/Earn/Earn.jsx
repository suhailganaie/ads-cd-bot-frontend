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

  // Load points + token
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
      } catch {
        if (alive) setPtsError('Failed to load points');
      } finally {
        if (alive) setPtsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API, tgUser?.id, tgUser?.username]); // Login + points [web:3324]

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
  }; // Frequency capping for interstitials improves UX and compliance. [web:3748][web:3746]

  const postWithAuth = async (path) => {
    if (!token) throw new Error('No token');
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  };

  // Existing network (libtl)
  const popup = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309('pop');
      setTotalPoints(p => (p ?? 0) + 2);
      await postWithAuth('/ads/main');
      startCooldown();
    } catch {
      setTotalPoints(p => (p ?? 0) - 2);
    }
  };

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

  // Adexium helpers: create instance once per click, listen, request, then reward on playback completed
  const runAdexium = async ({ wid, format, rewardPath, rewardDelta }) => {
    if (!canShow || !window.AdexiumWidget) return;
    return new Promise((resolve) => {
      try {
        const adx = new window.AdexiumWidget({
          wid,
          adFormat: format,
          // debug: true, // enable during testing only
        });

        const onReceived = (ad) => {
          adx.displayAd(ad);
        };
        const onCompleted = async () => {
          adx.off?.('adReceived', onReceived);
          adx.off?.('adPlaybackCompleted', onCompleted);
          adx.off?.('noAdFound', onNoAd);
          // reward after confirmed completion
          setTotalPoints(p => (p ?? 0) + rewardDelta);
          try { await postWithAuth(rewardPath); } catch { setTotalPoints(p => (p ?? 0) - rewardDelta); }
          startCooldown();
          resolve('done');
        };
        const onNoAd = () => {
          adx.off?.('adReceived', onReceived);
          adx.off?.('adPlaybackCompleted', onCompleted);
          adx.off?.('noAdFound', onNoAd);
          resolve('noAd');
        };

        adx.on?.('adReceived', onReceived);
        adx.on?.('adPlaybackCompleted', onCompleted);
        adx.on?.('noAdFound', onNoAd);

        adx.requestAd?.(format); // request immediately for click-to-earn
      } catch {
        resolve();
      }
    });
  }; // Matches Adexium advanced integration events and flow. [web:3707]

  // New partner buttons mapped to existing backend
  const adxMain = () => runAdexium({
    wid: 'b6509d9f-3faf-4e19-af77-ae292cde7eb6',
    format: 'interstitial',
    rewardPath: '/ads/main',
    rewardDelta: 2
  });

  const adxSide = () => runAdexium({
    wid: '523e4b9e-f0a7-43c2-8e74-285d4d42bdc9',
    format: 'push-like',
    rewardPath: '/ads/side',
    rewardDelta: 1
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3>🎯 Earn Points by Watching Ads</h3>
        <span className="muted">
          {ptsLoading ? 'Loading…' : ptsError ? '—' : `${totalPoints ?? 0} pts`}
        </span>
      </div>

      <div className="ad-buttons">
        {/* Existing partner */}
        <button className="ad-button main" onClick={popup} disabled={!canShow || !token}>
          EARN (2) {cooldown ? `• ${cooldown}s` : ''}
        </button>
        <button className="ad-button side" onClick={interstitial} disabled={!canShow || !token}>
          EARN (1) {cooldown ? `• ${cooldown}s` : ''}
        </button>

        {/* Adexium partner mapped to same endpoints */}
        <button className="ad-button main" onClick={adxMain} disabled={!canShow || !token}>
          EARN (2) – A {cooldown ? `• ${cooldown}s` : ''}
        </button>
        <button className="ad-button side" onClick={adxSide} disabled={!canShow || !token}>
          EARN (1) – A {cooldown ? `• ${cooldown}s` : ''}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 8 }}>
        Please wait 15 seconds between ads to prevent abuse.
      </p>
    </div>
  );
}
