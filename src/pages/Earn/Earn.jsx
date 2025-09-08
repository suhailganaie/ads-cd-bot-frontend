// src/pages/Earn/Earn.jsx
import React, { useEffect, useRef, useState } from 'react';
import useTelegram from '../../hooks/useTelegram'; // Read Telegram user at runtime [web:2716]  

const API = import.meta.env.VITE_API_BASE; // /api in dev via Vite proxy; full URL in prod [web:2628]  

export default function Earn() {
  const { tgUser } = useTelegram(); // { id, username } if inside Telegram [web:2626]  
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef();

  const [totalPoints, setTotalPoints] = useState(null);
  const [ptsLoading, setPtsLoading] = useState(true);
  const [ptsError, setPtsError] = useState(null);

  // Fetch current user's points on mount and whenever Telegram identity appears
  useEffect(() => {
    let alive = true;
    const telegram_id = tgUser?.id ? String(tgUser.id) : import.meta.env.VITE_DEV_TID || 'guest'; // Dev fallback [web:2628]  
    const username = tgUser?.username || import.meta.env.VITE_DEV_USERNAME || 'guest'; // Dev fallback [web:2628]  

    (async () => {
      try {
        setPtsLoading(true);
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id, username }), // Backend contract: POST JSON [web:2582]  
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); // HTTP guard [web:2752]  
        const data = await res.json(); // Parse application/json [web:2752]  
        const pts = data?.user?.points ?? 0; // Read user.points from response [web:2603]  
        if (alive) setTotalPoints(pts);
      } catch (e) {
        if (alive) setPtsError('Failed to load points'); // Display minimal error [web:2752]  
      } finally {
        if (alive) setPtsLoading(false);
      }
    })();

    return () => { alive = false; }; // Abort pattern for effects [web:2776]  
  }, [API, tgUser?.id, tgUser?.username]); // Refresh when Telegram identity becomes available [web:2716]  

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

  // Ad actions (stubbed)
  const popup = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return; // Guard external SDK [web:2772]  
    try {
      await window.show_9822309('pop'); // Popup ad [web:2772]  
      alert('Popup completed — +2 points (stubbed)'); // Replace with backend credit call if implemented [web:2752]  
      startCooldown();
    } catch {}
  };

  const interstitial = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return; // Guard external SDK [web:2772]  
    try {
      await window.show_9822309(); // Interstitial ad [web:2772]  
      alert('Interstitial watched — +1 point (stubbed)'); // Replace with backend credit call if implemented [web:2752]  
      startCooldown();
    } catch {}
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
        <button className="ad-button main" onClick={popup} disabled={!canShow}>
          EARN (2) {cooldown ? `• ${cooldown}s` : ''}
        </button>
        <button className="ad-button side" onClick={interstitial} disabled={!canShow}>
          EARN (1) {cooldown ? `• ${cooldown}s` : ''}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 8 }}>
        Please wait 15 seconds between ads to prevent abuse.
      </p>
    </div>
  );
}
