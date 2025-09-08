import React, { useMemo, useState, useEffect, useCallback } from 'react';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Invite() {
  // Guard missing API to avoid blank screen on bad envs
  if (!API) {
    return (
      <section className="card">
        <h3>Invite friends</h3>
        <p className="muted">API not configured. Set VITE_API_BASE at build time.</p>
      </section>
    );
  } // Vite envs must start with VITE_ and exist at build time. [web:3412][web:3429]

  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';

  // Telegram identity
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';
  const startParam = unsafe?.start_param || ''; // inviter id if opened via startapp

  // Single-source auth headers (prefer tma init data, fallback to x-telegram-id)
  const authHeaders = useMemo(
    () => (initDataRaw ? { Authorization: `tma ${initDataRaw}` } : { 'x-telegram-id': userId }),
    [initDataRaw, userId]
  ); // Use Authorization: tma <initData> per Mini Apps auth guidance. [web:3332][web:3318]

  // Personal deep link
  const BOT_USERNAME = 'ADS_Cd_bot';
  const APP_NAME = 'ADS';
  const inviteLink = useMemo(() => {
    const base = `https://t.me/${BOT_USERNAME}/${APP_NAME}`;
    return userId ? `${base}?startapp=${encodeURIComponent(userId)}` : base;
  }, [userId]); // startapp appears as start_param on next open. [web:3338][web:3300]

  // Optional: open a session for server-side init data validation
  useEffect(() => {
    if (!initDataRaw) return;
    fetch(`${API}/session/open`, {
      method: 'POST',
      headers: { Authorization: `tma ${initDataRaw}` }
    }).catch(() => {});
  }, [API, initDataRaw]); // Standard pattern to pass init data to backend. [web:3332][web:3318]

  // Auto-claim once per inviter/invitee pair
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
  const [inviteCount, setInviteCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchInviteCount = useCallback(async () => {
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
      setErr(String((e && e.message) || e)); // no TypeScript annotation in JSX
    } finally {
      setLoading(false);
    }
  }, [API, authHeaders]); // Robust fetch with error state. [web:3426][web:3336]

  // Fetch on mount and after key changes
  useEffect(() => { fetchInviteCount(); }, [fetchInviteCount]); // on mount. [web:3336]
  useEffect(() => { if (claimedOnce) fetchInviteCount(); }, [claimedOnce, fetchInviteCount]); // after auto-claim. [web:3336]
  useEffect(() => { if (userId) fetchInviteCount(); }, [userId, fetchInviteCount]); // identity change. [web:3336]
  useEffect(() => { if (startParam) fetchInviteCount(); }, [startParam, fetchInviteCount]); // param change. [web:3338]

  // Refetch on focus to defeat cached
