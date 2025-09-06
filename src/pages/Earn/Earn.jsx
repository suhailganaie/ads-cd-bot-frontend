import React, { useRef, useState, useEffect } from 'react'; // + useEffect for fetching[web:1704][web:1677]

const API = import.meta.env.VITE_API_URL; // Vite env, set in Vercel project[web:1462][web:1459]

export default function Earn() {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef();

  // NEW: points state (doesn’t affect ad buttons)
  const [totalPoints, setTotalPoints] = useState(null);
  const [ptsLoading, setPtsLoading] = useState(true);
  const [ptsError, setPtsError] = useState(null);

  // NEW: fetch total points on mount; safe cleanup
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPtsLoading(true);
        const token = localStorage.getItem('adsbot_token') || '';
        const res = await fetch(`${API}/auth/login`, {
          method: token ? 'GET' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          ...(token ? {} : { body: JSON.stringify({ telegram_id: 'guest' }) })
        });
        const data = await res.json();
        const pts = data?.user?.points ?? data?.points ?? 0;
        if (alive) setTotalPoints(pts);
      } catch (e) {
        if (alive) setPtsError('Failed to load points');
      } finally {
        if (alive) setPtsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []); // fetch-on-mount pattern[web:1704][web:1677]

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

  const popup = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309('pop');
      alert('Popup completed — +2 points (stubbed)');
      startCooldown();
    } catch {}
  };

  const interstitial = async () => {
    if (!canShow || typeof window.show_9822309 !== 'function') return;
    try {
      await window.show_9822309();
      alert('Interstitial watched — +1 point (stubbed)');
      startCooldown();
    } catch {}
  };

  return (
    <div className="card">
      {/* NEW: compact total points readout; rest of UI is unchanged */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3>🎯 Earn Points by Watching Ads</h3>
        <span className="muted">
          {ptsLoading ? 'Loading…' : ptsError ? '—' : `${totalPoints} pts`}
        </span>
      </div>

      <div className="ad-buttons">
        <button className="ad-button main" onClick={popup} disabled={!canShow}>
          EARN(2) {cooldown ? `• ${cooldown}s` : ''}
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
