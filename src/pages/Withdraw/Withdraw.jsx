import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../../styles/withdraw.css';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Withdraw() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';

  // Auth headers: x-telegram-id (same as other screens)
  const authHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    // If switching to verified initData in backend, uncomment:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]);

  useEffect(() => { try { tg?.expand?.(); tg?.ready?.(); } catch {} }, []);

  // Rules (ratio/min)
  const [rules, setRules] = useState({ ratio: 100, min_tokens: 10 });
  useEffect(() => {
    if (!API) return;
    fetch(`${API}/withdrawals/rules`)
      .then(r => r.json()).then((d) => d && setRules(d))
      .catch(() => {});
  }, [API]);

  // Balance in points
  const [balance, setBalance] = useState(null);
  const [loadingBal, setLoadingBal] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!API) return;
    setLoadingBal(true);
    try {
      const res = await fetch(`${API}/ads/balance`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data?.points === 'number') setBalance(data.points);
    } catch {}
    setLoadingBal(false);
  }, [API, authHeaders]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // Form state (tokens, not points)
  const [tokens, setTokens] = useState('');          // integer tokens
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const isEvmAddress = (a) => /^0x[a-fA-F0-9]{40}$/.test(String(a || '').trim());

  // Derived helpers
  const maxTokens = useMemo(() => {
    const pts = Number(balance || 0);
    return Math.floor(pts / (rules?.ratio || 100));
  }, [balance, rules]);

  const disabled = useMemo(() => {
    const t = Number(tokens);
    if (!API || !Number.isInteger(t) || t < (rules?.min_tokens || 10)) return true;
    if (!isEvmAddress(address)) return true;
    if (balance !== null && t > maxTokens) return true;
    return false;
  }, [API, tokens, address, balance, rules, maxTokens]);

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
        body: JSON.stringify({
          tokens: t,
          address: String(address).trim() || undefined
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `withdraw_failed_${res.status}`);
      } else {
        setOk('Withdrawal request submitted');
        setTokens(''); setAddress('');
        fetchBalance();
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
        <span>Balance (points)</span>
        <strong>{loadingBal ? '…' : (balance ?? '—')}</strong>
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
            disabled={maxTokens < rules.min_tokens}
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
        Tokens convert at {rules.ratio} points each; min {rules.min_tokens} tokens per request.
      </p>
    </main>
  );
}
