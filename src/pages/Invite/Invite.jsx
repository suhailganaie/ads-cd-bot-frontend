import React, { useMemo, useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || ''; // signed init data (optional server validation)

  // Current Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const username = unsafe?.user?.username || '';

  // Inviter TID if opened via t.me/BOT/APP?startapp=<inviter_tid>
  // Telegram duplicates the parameter into initDataUnsafe.start_param for the session. [web:2833]
  const startParam = unsafe?.start_param || '';

  // Mini App deep link builder for sharing
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp value becomes start_param for the invitee on open. [web:2833]

  // Optional: open a session for server-side validation of init data
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // Server can validate signed init data per Mini Apps docs. [web:2788][web:2626]

  // Auto-claim on first open if a valid inviter is present
  const [claimedOnce, setClaimedOnce] = useState(false);
  useEffect(() => {
    if (!startParam || !userId || startParam === userId || claimedOnce) return; // avoid self/duplicates
    const key = `invite:auto:${userId}:${startParam}`;
    if (localStorage.getItem(key)) { setClaimedOnce(true); return; }

    // Use the existing backend contract: header x-telegram-id = invitee, body.inviter_tid
    fetch(`${API}/invite/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-id': userId
      },
      body: JSON.stringify({ inviter_tid: startParam })
    })
      .catch(() => {})
      .finally(() => {
        localStorage.setItem(key, '1'); // persist that we attempted once
        setClaimedOnce(true);
      });
  }, [API, startParam, userId]); // Auto-claim pattern; UI need not show a button. [web:2838][web:2836]

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
  }; // Standard fetch/link patterns and header usage. [web:2752][web:2861]

  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and earn rewards.</p>

      {/* Show info-only banner when an invite param is present; no button needed */}
      {startParam && startParam !== userId && (
        <div className="note success" style={{ marginBottom: 8 }}>
          Invite detected: {startParam}. Reward will be applied automatically.
        </div>
      )}

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
