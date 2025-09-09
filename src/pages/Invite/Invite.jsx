// src/pages/Invite/Invite.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import '../../styles/invite.css'; // component-only styles; layout comes from App.css [web:4251]

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || '';
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';

  // Use Telegram ready/expand to stabilize the webview height [web:4106]
  useEffect(() => { try { tg?.ready?.(); tg?.expand?.(); } catch {} }, []); // no trailing comment in code [web:4106]

  // Identity headers (x-telegram-id; optional tma) [web:4106]
  const authHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    // If backend verifies initData, you can also send:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]); // consistent across requests [web:4106]

  // Deep link for sharing (shows as start_param for invitees) [web:4106]
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // pure string build [web:4106]

  // Optional Mini App handshake (safe no-op outside Telegram) [web:4106]
  useEffect(() => {
    if (!API || !initDataRaw) return;
    fetch(`${API}/session/open`, { method: 'POST', headers: { Authorization: `tma ${initDataRaw}` } })
      .catch(() => {});
  }, [API, initDataRaw]); // background handshake [web:4106]

  // Auto-claim referral once per inviter/invitee pair [web:4106]
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
  }, [API, startParam, userId, authHeaders]); // idempotent claim [web:4106]

  // Invite count + background refresh when visible [web:4106]
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
  }, [API, authHeaders]); // robust fetch [web:4106]

  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // initial load [web:4106]
  useEffect(() => {
    let id;
    const tick = () => fetchInviteCount();
    const start = () => { if (!id) id = setInterval(tick, 20000); };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    const onVis = () => (document.hidden ? stop() : (tick(), start()));
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [fetchInviteCount]); // only poll when visible [web:4106]

  return (
    <>
      {/* Render inside the global .app shell provided by App.css */}
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
            <button
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  tg?.showPopup ? tg.showPopup({ message: 'Link copied' }) : alert('Link copied');
                } catch {
                  tg?.showPopup ? tg.showPopup({ message: 'Copy failed' }) : alert('Copy failed');
                }
              }}
            >
              Copy link
            </button>

            <button
              className="btn primary"
              onClick={() => {
                const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
                if (tg?.openTelegramLink) tg.openTelegramLink(url);
                else window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              Share on Telegram
            </button>
          </div>
        </div>
      </div>

      {/* Safe-area spacer so nothing hides behind the fixed tab bar */}
      <div className="page-end-spacer" />
    </>
  );
}
