// src/pages/Invite/Invite.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import '../../styles/invite.css'; // card-only styles; layout comes from App.css

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || '';
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';

  // Identity headers (same as backend)
  const authHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    // Optional verified initData:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]); // Uses global shell; no page CSS padding here. [web:4252]

  useEffect(() => { try { tg?.ready?.(); tg?.expand?.(); } catch {} }, []);

  // Deep link that appears as start_param for invitees
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]);

  // Optional Mini App handshake (no-op in web)
  useEffect(() => {
    if (!API || !initDataRaw) return;
    fetch(`${API}/session/open`, { method: 'POST', headers: { Authorization: `tma ${initDataRaw}` } })
      .catch(() => {});
  }, [API, initDataRaw]); // Matches Home behavior; still uses App.css for layout. [web:4252]

  // Auto-claim once per inviter/invitee pair
  useEffect(() => {
    if (!API || !startParam || !userId || startParam === userId) return;
    const key = `invite:auto:${userId}:${startParam}`;
    if (localStorage.getItem(key)) return;
    fetch(`${API}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ inviter_tid: startParam })
    }).catch(() => {}).finally(() => {
      localStorage.setItem(key, '1');
    });
  }, [API, startParam, userId, authHeaders]); // Idempotent claim. [web:4252]

  // Invite count with visibility-aware polling
  const [inviteCount, setInviteCount] = useState(null);
  const [err, setErr] = useState(null);

  const fetchInviteCount = useCallback(async () => {
    if (!API) { setErr('API not configured'); return; }
    try {
      const res = await fetch(`${API}/invite/count`, { headers: authHeaders });
      if (!res.ok) throw new Error(`count http ${res.status}`);
      const data = await res.json().catch(() => ({}));
      if (typeof data?.count === 'number') setInviteCount(data.count);
      else throw new Error('count parse error');
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }, [API, authHeaders]); // Relies on headers only; no local layout. [web:4252]

  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]);
  useEffect(() => {
    let id;
    const tick = () => fetchInviteCount();
    const start = () => { if (!id) id = setInterval(tick, 20000); };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    const onVis = () => (document.hidden ? stop() : (tick(), start()));
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [fetchInviteCount]); // Background refresh; consistent with Home. [web:4252]

  return (
    // Important: render inside the global .app shell from App.jsx, not a page wrapper here
    <div className="invite-card">
      <h3 className="inv-title">Invite friends</h3>
      <p className="inv-sub">Share a personal link to earn rewards.</p>

      <div className="inv-metric">
        <span>Invites</span>
        <strong>{inviteCount ?? 0}</strong>
      </div>

      {err && <div className="inv-error">Error: {err}</div>}

      <div className="inv-linkbox">
        <div className="inv-link">{inviteLink}</div>
        <div className="inv-actions">
          <button className="btn" onClick={async () => {
            try {
              await navigator.clipboard.writeText(inviteLink);
              tg?.showPopup ? tg.showPopup({ message: 'Link copied' }) : alert('Link copied');
            } catch {
              tg?.showPopup ? tg.showPopup({ message: 'Copy failed' }) : alert('Copy failed');
            }
          }}>Copy link</button>

          <button className="btn primary" onClick={() => {
            const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
            if (tg?.openTelegramLink) tg.openTelegramLink(url);
            else window.open(url, '_blank', 'noopener,noreferrer');
          }}>Share on Telegram</button>
        </div>
      </div>
    </div>
  );
}
