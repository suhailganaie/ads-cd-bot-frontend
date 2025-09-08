import React, { useMemo, useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function Invite() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || ''; // optional: server validation [web:2788]

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : ''; // current user id [web:2626]
  const startParam = unsafe?.start_param || ''; // inviter id if opened via startapp [web:2833]

  // Deep link for sharing (personal link includes own tid)
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp becomes invitee's start_param on open [web:2833]

  // Optional: open a session so backend can validate signed init data
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {}); // backend validates per Mini App init data spec [web:2788][web:2626]
  }, [API, initDataRaw]);

  // Silent auto-claim: no UI, no messages
  useEffect(() => {
    if (!startParam || !userId || startParam === userId) return; // ignore empty/self [web:2833]
    const key = `invite:auto:${userId}:${startParam}`;
    if (localStorage.getItem(key)) return; // run once per pair [web:2838]
    fetch(`${API}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-id': userId },
      body: JSON.stringify({ inviter_tid: startParam })
    }).catch(() => {}).finally(() => {
      localStorage.setItem(key, '1'); // mark attempted so it stays silent [web:2836]
    });
  }, [API, startParam, userId]);

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
  }; // standard clipboard fallback pattern with useEffect state updates [web:2772][web:2752]

  const shareInTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join ADS BOT and earn rewards!')}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }; // safe external open patterns for Mini Apps and web [web:2752]

  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="muted">Share a personal link to invite friends and earn rewards.</p>

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
