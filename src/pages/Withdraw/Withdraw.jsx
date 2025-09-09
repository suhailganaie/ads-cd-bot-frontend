import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../../styles/withdraw.css';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Withdraw() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const user = unsafe?.user || {};
  const userId = user?.id ? String(user.id) : '';
  const username = user?.username || '';

  // 1) Login once to obtain JWT; also seed points from login response
  const [token, setToken] = useState('');
  const [balance, setBalance] = useState(null); // points
  useEffect(() => {
    if (!API || !userId) return;
    fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: userId, username }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.token) setToken(d.token);
        if (Number.isFinite(Number(d?.user?.points))) setBalance(Number(d.user.points));
      })
      .catch(() => {});
  }, [API, userId, username]); // Retrieve JWT + initial points. [web:4131][web:4170]

  // 2) Build headers: prefer Bearer JWT, else x-telegram-id fallback
  const authHeaders = useMemo(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    else if (userId) h['x-telegram-id'] = userId;
    return h;
  }, [token, userId]); // Ensures same identity for all endpoints. [web:4131]

  useEffect(() => { try { tg?.expand?.(); tg?.ready?.(); } catch {} }, []);

  // 3) Rules (ratio/min) used for conversion & validation
  const [rules, setRules] = useState({ ratio: 100, min_tokens: 10 });
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/withdrawals/rules`)
      .then((r) => r.json())
      .then((d) => d && setRules(d))
      .catch(() => {});
  }, [API]); // Pull min_tokens and ratio for client UX. [web:4113]

  // 4) Balance fetch (points) with same headers as protected routes
  const [loadingBal, setLoadingBal] = useState(false);
  const fetchBalance = useCallback(async () => {
    if (!API) return;
    setLoadingBal(true);
    try {
      const res = await fetch(`${API}/ads/balance`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Number.isFinite(Number(data?.points))) {
        setBalance(Number(data.points));
      }
    } catch {}
    setLoadingBal(false);
  }, [API, authHeaders]);

  // Refresh on mount and whenever token becomes available
  useEffect(() => { fetchBalance(); }, [fetchBalance]); // mount [web:4188]
  useEffect(() => { if (token) fetchBalance(); }, [token, fetchBalance]); // after JWT arrives [web:4131]

  // 5) Form state (tokens)
  const [tokens, setTokens] = useState(''); // integer tokens to withdraw
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const isEvmAddress = (a) => /^0x[a-fA-F0-9]{40}$/.test(String(a || '').trim());

  // Convert points → tokens for display and Max
  const ratio = Number(rules?.ratio || 100);
  const tokensFromPoints = (Number(balance || 0) / ratio);
  const tokensDisplay = Number.isFinite(tokensFromPoints) ? tokensFromPoints.toFixed(3) : '—'; // 3 decimals [web:4154]
  const maxTokens = Math.floor((Number(balance || 0)) / ratio); // integer cap from points [web:4113]

  const disabled = useMemo(() => {
    const t = Number(tokens);
    if (!API || !Number.isInteger(t) || t < (rules?.min_tokens || 10)) return true;
    if (!isEvmAddress(address)) return true;
    if (balance !== null && t > maxTokens) return true;
    return false;
  }, [API, tokens, address, balance, rules, maxTokens]); // Mirror server checks. [web:4114]

  // 6) Submit → POST /api/withdrawals with { tokens, address }
  const submit = async (e) => {
    e?.preventDefault?.();
    setError(null); setOk(null);
    if (disabled) return;
    setSubmitting(true);
    try {
      const t = Number(tokens);
      const res = await fetch(`${API}/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ tokens: t, address: String(address).trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `withdraw_failed_${res.status}`);
      } else {
        setOk('Withdrawal request submitted');
        setTokens(''); setAddress('');
        fetchBalance(); // reflect debited points
      }
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="wd-page">
      <h2>Withdraw</h2>
      <p className="muted">Send tokens to a BEP20 (ERC20-format) address.</p>

      <div className="wd-balance">
        <span>Balance (tokens)</span>
        <strong>{loadingBal ? '…' : tokensDisplay}</strong>
      </div>

      <form className="wd-form" onSubmit={submit}>
        <label className="wd-label">
          Amount (tokens)
          <input
            type="number"
            inputMode="numeric"
            min={rules.min_tokens}
            step="1"
            placeholder={`Min ${rules.min_tokens}`}
            value={tokens}
            onChange={(e) => setTokens(e.target.value)}
          />
          <button
            type="button"
            className="wd-mini"
            onClick={() => setTokens(String(Math.max(rules.min_tokens, maxTokens)))}
            disabled={!Number.isFinite(balance) || maxTokens < rules.min_tokens}
          >
            Max ({maxTokens})
          </button>
        </label>

        <label className="wd-label">
          BEP20 address (0x…)
          <input
            type="text"
            placeholder="0x1234… (BSC)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {!address ? null : isEvmAddress(address) ? (
            <span className="wd-valid">Valid address</span>
          ) : (
            <span className="wd-error">Invalid BEP20/ERC20 address</span>
          )}
        </label>

        {error && <div className="wd-error">Error: {error}</div>}
        {ok && <div className="wd-ok">{ok}</div>}

        <button className="wd-submit" disabled={disabled || submitting} type="submit">
          {submitting ? 'Submitting…' : 'Submit withdrawal'}
        </button>
      </form>

      <p className="wd-hint muted">
        {rules.ratio} points = 1 token. ; min {rules.min_tokens} tokens per request.
      </p>
    </main>
  );
}
