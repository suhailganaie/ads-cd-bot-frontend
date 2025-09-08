import React, { useMemo, useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || '';

  // Single source of truth for auth headers (prefer tma init data)
  const authHeaders = useMemo(
    () => (initDataRaw ? { Authorization: `tma ${initDataRaw}` } : { 'x-telegram-id': userId }),
    [initDataRaw, userId]
  ); // Mini Apps recommend passing raw init data in Authorization: tma <initData>. [web:3332][web:3318]

  // Deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp maps to start_param on next open. [web:3338][web:3300]

  // Optional: open server session for init data validation
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // Transmit init data as documented. [web:3332][web:3318]

  // Auto-claim once per inviter/invitee pair
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
  }, [API, startParam, userId, authHeaders]); // Same auth scheme for claim and count. [web:3332][web:3318]

  // Count loader
  const [inviteCount, setInviteCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInviteCount = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/invite/count`, { headers: authHeaders });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json().catch(() => ({}));
      if (typeof data?.count === 'number') setInviteCount(data.count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]); // Consistent headers prevent identity mismatches. [web:3332][web:3318]

  // Load on mount
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // React fetch pattern. [web:3336]

  // Refresh after auto-claim completes
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce, fetchInviteCount]); // Conditional refetch. [web:3336]

  // Refresh when identity/params change
  useEffect(() => { if (userId) fetchInviteCount(); }, [userId, fetchInviteCount]); // User changes. [web:3336]
  useEffect(() => { if (startParam) fetchInviteCount(); }, [startParam, fetchInviteCount]); // Param changes. [web:3350]

  // Refresh when the webview regains focus (some clients cache pages)
  useEffect(() => {
    const onVis = () => { if (!document.hidden) fetchInviteCount(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchInviteCount]); // Page Visibility API in React. [web:3383][web:3385]

  // Manual refresh button (useful during testing)
  const onRefresh = () => fetchInviteCount();

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

      <div className="muted" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        Invites: <strong>{inviteCount ?? 0}</strong>
        <button onClick={onRefresh} disabled={loading} style={{ padding: '2px 8px' }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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
