import React, { useMemo, useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || ''; // inviter id if opened via startapp

  // Personal deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp becomes start_param for invitee on open [web:2833][web:2626]

  // Optional: open a session for server-side validation of init data
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // run-once side effect per React useEffect guidance [web:2883][web:2772]

  // Silent auto-claim (no UI)
  const [claimedOnce, setClaimedOnce] = useState(false);
  useEffect(() => {
    if (!startParam || !userId || startParam === userId) return;
    const key = `invite:auto:${userId}:${startParam}`;
    if (localStorage.getItem(key)) { setClaimedOnce(true); return; }

    fetch(`${API}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-id': userId },
      body: JSON.stringify({ inviter_tid: startParam })
    }).catch(() => {}).finally(() => {
      localStorage.setItem(key, '1');
      setClaimedOnce(true);
    });
  }, [API, startParam, userId]); // useEffect for fetch is the standard pattern in React [web:2883][web:2878]

  // Invite counter
  const [inviteCount, setInviteCount] = useState(null);
  const fetchInviteCount = async () => {
    try {
      const headers = initDataRaw ? { Authorization: `tma ${initDataRaw}` } : {};
      const res = await fetch(`${API}/invite/count`, { headers });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (typeof data?.count === 'number') setInviteCount(data.count);
    } catch {}
  };

  // Load count on mount
  useEffect(() => { fetchInviteCount(); }, []); // mount-only per useEffect docs [web:2942][web:2759]
  // Refresh count after auto-claim attempt completes
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce]); // conditional effect [web:2942]

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
