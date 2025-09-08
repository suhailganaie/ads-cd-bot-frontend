import React, { useMemo, useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || ''; // raw signed string for optional server validation

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const username = unsafe?.user?.username || '';

  // If opened from someone’s link, Telegram duplicates it here
  const startParam = unsafe?.start_param || ''; // inviter's Telegram ID per design

  // Your Mini App deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS'; // t.me/ADS_Cd_bot/ADS

  // Build personal invite link: startapp=<own_tid>
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // Telegram startapp passes a value to start_param on next open [web:2833][web:2837].

  // Optional: Open a session so the server can validate initData signatures
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // Server can verify init data per Telegram guidance [web:2788].

  // If this user arrived via someone’s link, allow claiming the invite on first open
  const [claimMsg, setClaimMsg] = useState('');
  const [claiming, setClaiming] = useState(false);

  const claimInvite = async () => {
    if (!startParam || !userId) return;
    try {
      setClaiming(true);
      // Backend contract: header x-telegram-id is the invitee, body.inviter_tid is the inviter
      const res = await fetch(`${API}/invite/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-id': userId // invitee TID in header
        },
        body: JSON.stringify({ inviter_tid: startParam })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      setClaimMsg('Invite claimed successfully.');
    } catch (e) {
      setClaimMsg(e.message || 'Failed to claim invite.');
    } finally {
      setClaiming(false);
    }
  }; // Matches documented header/body usage for the claim endpoint [web:2752].

  // UI helpers
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
  }; // Safe external open pattern for Mini Apps [web:2842][web:2573].

  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and earn rewards.</p>

      {startParam ? (
        <div className="note success" style={{ marginBottom: 8 }}>
          Invite detected: {startParam}
          <div style={{ marginTop: 8 }}>
            <button onClick={claimInvite} disabled={claiming}>
              {claiming ? 'Claiming…' : 'Claim invite'}
            </button>
            {claimMsg && <p className="muted" style={{ marginTop: 6 }}>{claimMsg}</p>}
          </div>
        </div>
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
