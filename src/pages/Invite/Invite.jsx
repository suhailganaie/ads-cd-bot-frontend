import React, { useMemo, useState, useEffect, useCallback } from 'react';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  // Guard against missing API to avoid white screen
  if (!API) {
    return (
      <section className="card">
        <h3>Invite friends</h3>
        <p className="muted">API not configured. Set VITE_API_BASE at build time.</p>
      </section>
    );
  } // Vite envs must be defined at build and start with VITE_. [web:3412][web:3398]

  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || ''; // inviter id if opened via startapp

  // Single source auth headers (prefer tma init data, fallback to x-telegram-id)
  const authHeaders = useMemo(
    () => (initDataRaw ? { Authorization: `tma ${initDataRaw}` } : { 'x-telegram-id': userId }),
    [initDataRaw, userId]
  ); // Transmit raw init data in Authorization header per Mini Apps docs. [web:3332][web:3318]

  // Personal deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp maps to start_param on next open. [web:3338][web:3300]

  // Optional: open session for server-side validation of init data
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // Recommended way to pass init data to server. [web:3332][web:3318]

  // Silent auto-claim once per inviter/invitee pair
  const [claimedOnce, setClaimedOnce] = useState(false);
  useEffect(() => {
    try {
      if (!startParam || !userId || startParam === userId) return;
      const key = `invite:auto:${userId}:${startParam}`;
      if (localStorage.getItem(key)) { setClaimedOnce(true); return; }
      fetch(`${API}/invite/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ inviter_tid: startParam })
      })
        .catch((e) => console.warn('claim error', e))
        .finally(() => {
          localStorage.setItem(key, '1');
          setClaimedOnce(true);
        });
    } catch (e) {
      console.warn('auto-claim failed', e);
      setClaimedOnce(true);
    }
  }, [API, startParam, userId, authHeaders]); // Keep identity consistent across endpoints. [web:3332][web:3318]

  // Invite count
  const [inviteCount, setInviteCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchInviteCount = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/invite/count`, { headers: authHeaders });
      if (!res.ok) {
        setErr(`count http ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (typeof data?.count === 'number') {
        setInviteCount(data.count);
      } else {
        setErr('count parse error');
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]); // Standard fetch pattern with error state. [web:3336][web:3374]

  // Fetch on mount
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // Mount/refetch pattern. [web:3336]

  // Refetch after auto-claim completes, and on identity/param change
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce, fetchInviteCount]); // [web:3336]
  useEffect(() => { if (userId) fetchInviteCount(); }, [userId, fetchInviteCount]); // [web:3336]
  useEffect(() => { if (startParam) fetchInviteCount(); }, [startParam, fetchInviteCount]); // [web:3338]

  // Refetch on focus; some clients cache the webview
  useEffect(() => {
    const onVis = () => { if (!document.hidden) fetchInviteCount(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchInviteCount]); // Page Visibility API for reliable refresh. [web:3383][web:3321]

  const onRefresh = () => fetchInviteCount();

  // Render
  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and earn rewards.</p>

      <div className="muted" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        Invites: <strong>{inviteCount ?? 0}</strong>
        <button onClick={onRefresh} disabled={loading} style={{ padding: '2px 8px' }}>
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
          <button onClick={onRefresh}>Sync</button>
          <button onClick={async () => {
            try {
              await navigator.clipboard.writeText(inviteLink);
              alert('Link copied');
            } catch {
              alert('Copy failed');
            }
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
