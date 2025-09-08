import React, { useMemo, useState, useEffect, useCallback } from 'react';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || '';

  // One auth scheme everywhere (prefer tma init data, fallback to x-telegram-id)
  const authHeaders = useMemo(
    () => (initDataRaw ? { Authorization: `tma ${initDataRaw}` } : { 'x-telegram-id': userId }),
    [initDataRaw, userId]
  ); // Send tma <initData> per Mini Apps auth docs; otherwise pass x-telegram-id. [web:3332][web:3318]

  // Deep link (userId in startapp)
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp appears as start_param for invitees on open. [web:3338][web:3300]

  // Optional: open a session so the server can validate init data (no UI dependency)
  useEffect(() => {
    if (!API || !initDataRaw) return;
    fetch(`${API}/session/open`, { method: 'POST', headers: { Authorization: `tma ${initDataRaw}` } }).catch(() => {});
  }, [API, initDataRaw]); // Transmit raw init data in Authorization header. [web:3332][web:3318]

  // Auto-claim once per inviter/invitee pair
  const [claimedOnce, setClaimedOnce] = useState(false);
  useEffect(() => {
    if (!API || !startParam || !userId || startParam === userId) return;
    const key = `invite:auto:${userId}:${startParam}`;
    if (localStorage.getItem(key)) { setClaimedOnce(true); return; }
    fetch(`${API}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ inviter_tid: startParam })
    })
      .catch(() => {})
      .finally(() => {
        localStorage.setItem(key, '1');
        setClaimedOnce(true);
      });
  }, [API, startParam, userId, authHeaders]); // Keep identity consistent for claim and count. [web:3332][web:3318]

  // Invite count
  const [inviteCount, setInviteCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchInviteCount = useCallback(async () => {
    if (!API) { setErr('API not configured'); return; }
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/invite/count`, { headers: authHeaders });
      if (!res.ok) {
        setErr(`count http ${res.status}`);
      } else {
        const data = await res.json().catch(() => ({}));
        if (typeof data?.count === 'number') setInviteCount(data.count);
        else setErr('count parse error');
      }
    } catch (e) {
      setErr(String((e && e.message) || e));
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]); // Standard React fetch with error state. [web:3346]

  // Load on mount and after key changes
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // mount [web:3346]
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce, fetchInviteCount]); // after auto-claim [web:3346]
  useEffect(() => { if (userId) fetchInviteCount(); }, [userId, fetchInviteCount]); // identity change [web:3346]
  useEffect(() => { if (startParam) fetchInviteCount(); }, [startParam, fetchInviteCount]); // param change [web:3338]

  // Refetch on focus; some Telegram clients cache the webview
  useEffect(() => {
    const onVis = () => { if (!document.hidden) fetchInviteCount(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchInviteCount]); // Page Visibility refresh. [web:3384]

  // Render safely even if env is missing
  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and earn rewards.</p>

      <div className="muted" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        Invites: <strong>{inviteCount ?? 0}</strong>
        <button onClick={fetchInviteCount} disabled={loading} style={{ padding: '2px 8px' }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {(!API || err) && (
        <div className="muted" style={{ color: '#f55', marginBottom: 8 }}>
          {API ? `Error: ${err}` : 'API not configured'}
        </div>
      )}

      <div className="invite-box">
        <div className="invite-link" style={{ wordBreak: 'break-all' }}>
          {inviteLink}
        </div>
        <div className="invite-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={async () => {
            try { await navigator.clipboard.writeText(inviteLink); alert('Link copied'); }
            catch { alert('Copy failed'); }
          }}>{'Copy link'}</button>
          <button onClick={() => {
            const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
            if (tg?.openTelegramLink) tg.openTelegramLink(url);
            else window.open(url, '_blank', 'noopener,noreferrer');
          }}>Share on Telegram</button>
        </div>

        {!userId && (
          <p className="muted" style={{ marginTop: 8 }}>
            Open inside Telegram to generate a personal invite link.
          </p>
        )}
      </div>
    </section>
  );
}
