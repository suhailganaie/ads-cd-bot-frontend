import React, { useMemo, useState, useEffect, useCallback } from 'react';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity (string)
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || '';

  // Use x-telegram-id everywhere (matches working curl). Optionally add tma.
  const authHeaders = useMemo(() => {
    const h = {} as Record<string, string>;
    if (userId) h['x-telegram-id'] = userId;
    // If backend also accepts tma, uncomment the next line:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]); // Align client with successful curl identity. [web:3346][web:3300]

  // Personal deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp shows as start_param for invitee. [web:3300][web:3324]

  // Optional: open a session (kept no-op if server doesn’t need it)
  useEffect(() => {
    if (!API || !initDataRaw) return;
    // Comment out if server doesn’t use session/open
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // Telegram init data background handshake. [web:3318]

  // Auto-claim once per inviter/invitee
  const [claimedOnce, setClaimedOnce] = useState(false);
  useEffect(() => {
    if (!API || !startParam || !userId || startParam === userId) return;
    const key = `invite:auto:${userId}:${startParam}`;
    if (localStorage.getItem(key)) { setClaimedOnce(true); return; }

    fetch(`${API}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ inviter_tid: startParam })
    }).catch(() => {}).finally(() => {
      localStorage.setItem(key, '1');
      setClaimedOnce(true);
    });
  }, [API, startParam, userId, authHeaders]); // Same header scheme as curl. [web:3346]

  // Invite count
  const [inviteCount, setInviteCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]); // Use the same header that returned count:4 via curl. [web:3346]

  // Load and refresh
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // mount [web:3346]
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce, fetchInviteCount]); // after claim [web:3346]
  useEffect(() => { if (userId) fetchInviteCount(); }, [userId, fetchInviteCount]); // identity change [web:3346]
  useEffect(() => { if (startParam) fetchInviteCount(); }, [startParam, fetchInviteCount]); // param change [web:3324]

  // Refetch on focus to avoid cached webview
  useEffect(() => {
    const onVis = () => { if (!document.hidden) fetchInviteCount(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchInviteCount]); // Visibility refresh. [web:3346]

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

      {err && (
        <div className="muted" style={{ color: '#f55', marginBottom: 8 }}>
          Error: {err}
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
          }}>Copy link</button>
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
