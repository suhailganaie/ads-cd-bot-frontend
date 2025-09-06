// src/pages/Invite.jsx
import React, { useMemo, useState, useEffect } from 'react';

// Optional: call a backend (fake for now) to open a session and let the server
// handle referral attribution using Telegram initDataRaw (Authorization: tma ...).
async function openSession() {
  const tg = window?.Telegram?.WebApp;
  const initDataRaw = tg?.initData || ''; // raw signed string from Telegram
  try {
    const res = await fetch('/api/session/open', {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` },
    });
    return await res.json();
  } catch {
    return null;
  }
}

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const init = tg?.initDataUnsafe || {};

  // Telegram user and referrer param (passed via startapp)
  const userId = init?.user?.id ? String(init.user.id) : '';
  const startParam = init?.start_param || ''; // if opened through someone’s link

  // Your Mini App link base
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS'; // t.me/ADS_Cd_bot/ADS

  // Build personal invite link
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]);

  // Open session (fake backend for now)
  useEffect(() => {
    openSession();
  }, []);

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

  // Share using Telegram’s share URL format that works reliably inside Mini Apps
  const shareInTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and grow the community.</p>

      {startParam ? (
        <div className="note success">Invite code detected</div>
      ) : null}

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
