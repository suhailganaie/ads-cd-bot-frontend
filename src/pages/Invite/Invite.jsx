import React, { useMemo, useState, useEffect, useCallback } from 'react';
import '../../styles/invite.css';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || '';
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';

  // Identity headers (x-telegram-id; keep consistent with backend)
  const authHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    // If backend validates initData, uncomment:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]); // Background-safe headers. [4]

  useEffect(() => { try { tg?.expand?.(); tg?.ready?.(); } catch {} }, []);

  // Generate deep link
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]);

  // Optional handshake for Mini Apps
  useEffect(() => {
    if (!API || !initDataRaw) return;
    fetch(`${API}/session/open`, { method: 'POST', headers: { Authorization: `tma ${initDataRaw}` } })
      .catch(() => {});
  }, [API, initDataRaw]);

  // Auto-claim one-time on first open with inviter param
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
  }, [API, startParam, userId, authHeaders]);

  // Invite count with background auto-refresh and visibility awareness
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
  }, [API, authHeaders]);

  // Initial load
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]);

  // Visibility-aware polling: refresh every 20s while visible; pause when hidden
  useEffect(() => {
    let id;
    const start = () => {
      if (id) return;
      id = setInterval(fetchInviteCount, 20000);
    };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    const onVis = () => (document.hidden ? stop() : (fetchInviteCount(), start()));
    onVis(); // run once now
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [fetchInviteCount]); // Efficient background updates. [3][4]

  return (
    <section className="invite-scene">
      <div className="glass-card">
        <h3 className="title">Invite friends</h3>
        <p className="subtitle">Share a personal link to earn rewards.</p>

        <div className="metric">
          <span>Invites</span>
          <strong>{inviteCount ?? 0}</strong>
        </div>

        {err && <div className="error">Error: {err}</div>}

        <div className="link-box">
          <div className="link-text">{inviteLink}</div>
          <div className="actions">
            <button
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
              onClick={() => {
                const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
                if (tg?.openTelegramLink) tg.openTelegramLink(url);
                else window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              Share on Telegram
            </button>
          </div>

          {!userId && <p className="hint">Open inside Telegram to generate a personal invite link.</p>}
        </div>
      </div>
    </section>
  );
}
