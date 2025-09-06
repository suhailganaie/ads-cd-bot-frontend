import React, { useRef, useState } from 'react';

export default function Earn() {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef();

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
      <h3>🎯 Earn Points by Watching Ads</h3>
      <div className="ad-buttons">
        <button className="ad-button main" onClick={popup} disabled={!canShow}>
          Main Ads (+2 points) {cooldown ? `• ${cooldown}s` : ''}
        </button>
        <button className="ad-button side" onClick={interstitial} disabled={!canShow}>
          Side Ads (+1 point) {cooldown ? `• ${cooldown}s` : ''}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Please wait 15 seconds between ads to prevent abuse.
      </p>
    </div>
  );
}
