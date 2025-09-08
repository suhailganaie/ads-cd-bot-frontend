import React, { useMemo, useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || ''; // inviter id if opened via startapp

  // Consistent auth headers for all calls (tma preferred, fallback to x-telegram-id)
  const authHeaders = useMemo(
    () => (initDataRaw ? { Authorization: `tma ${initDataRaw}` } : { 'x-telegram-id': userId }),
    [initDataRaw, userId]
  ); // Using tma with init data is the recommended Mini Apps auth method. [web:3318][web:3332]

  // Personal deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp value appears in initData.start_param on open. [web:3338][web:3300]

  // Optional: open a session for server-side validation of init data
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, { method: 'POST', headers: { Authorization: `tma ${initDataRaw}` } }).catch(() => {});
  }, [API, initDataRaw]); // Transmit init data per docs. [web:3318][web:3332]

  // Silent auto-claim (no UI)
  const [claimedOnce, setClaimedOnce] = useState(false);
  useEffect(() => {
    if (!startParam || !userId || startParam === userId) return;
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
  }, [API, startParam, userId, authHeaders]); // Match auth scheme across endpoints. [web:3318]

  // Invite counter
  const [inviteCount, setInviteCount] = useState(null);
  const fetchInviteCount = useCallback(async () => {
    try {
      const res = await fetch(`${API}/invite/count`, { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (typeof data?.count === 'number') setInviteCount(data.count);
    } catch {}
  }, [API, authHeaders]); // Consistent headers avoid identity mismatch. [web:3318][web:3332]

  // Load and refresh rules
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // on mount [web:3336]
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce, fetchInviteCount]); // after auto-claim [web:3336]
  useEffect(() => { if (startParam || userId) fetchInviteCount(); }, [startParam, userId, fetchInviteCount]); // param/user changes [web:3350]

  // Refresh on focus (Telegram webview may cache; reopen/focus needs refetch)
  useEffect(() => {
    const onVis = () => { if (!document.hidden) fetchInviteCount(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchInviteCount]); // Workaround for partial reloads in some clients. [web:3321][web:3300]

  // Share helpers
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const shareInTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and earn rewards.</p>

      <div className="muted" style={{ marginBottom: 8 }}>
        Invites: <strong>{inviteCount ?? 0}</strong>
      </div>

      <div className="invite-box">
        <div className="invite-link" style={{ wordBreak: 'break-all' }}>
          {inviteLink}
        </div>
        <div className="invite-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
          <button onClick={shareInTelegram}>Share on Telegram</button>
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
