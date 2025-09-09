import React, { useEffect, useMemo, useState, useCallback } from 'react';

import '../../styles/withdraw.css';
const API = import.meta.env?.VITE_API_BASE || '';

export default function Withdraw() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';

  // Use same auth scheme as Invite: x-telegram-id
  const authHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    // If backend also accepts tma, enable:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]); // Keep identity consistent across endpoints. [web:3346][web:3332]

  useEffect(() => {
    try { tg?.expand?.(); tg?.ready?.(); } catch {}
  }, []); // Fill Telegram viewport reliably. [web:3300]

  // Balance
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
  }, [API, authHeaders]); // Same headers as other screens. [web:3346]

  useEffect(() => { fetchBalance(); }, [fetchBalance]); // on mount [web:3346]

  // Form state
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  // BEP20/ERC20 address check (0x + 40 hex)
  const isEvmAddress = (a) => /^0x[a-fA-F0-9]{40}$/.test(String(a || '').trim());

  const disabled = useMemo(() => {
    const v = Number(amount);
    if (!API || !v || !(v > 0)) return true;
    if (!address || !isEvmAddress(address)) return true;
    if (balance !== null && v > Number(balance)) return true;
    return false;
  }, [API, amount, address, balance]); // Client guard; server validates too. [web:3600]

  const submit = async (e) => {
    e?.preventDefault?.();
    setError(null); setOk(null);
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/withdrawals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          method: 'BEP20',
          chain: 'bsc',
          token_standard: 'erc20',
          amount: Number(amount),
          address: String(address).trim(),
          memo: note || undefined
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `withdraw_failed_${res.status}`);
      } else {
        setOk('Withdrawal request submitted');
        setAmount(''); setAddress(''); setNote('');
        fetchBalance();
      }
    } catch (err) {
      setError(String((err && err.message) || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="wd-page">
      <h2>Withdraw</h2>
      <p className="muted">Send tokens to a BEP20 (ERC20-format) address.</p>

      <div className="wd-balance">
        <span>Balance</span>
        <strong>{loadingBal ? '…' : (balance ?? '—')}</strong>
      </div>

      <form className="wd-form" onSubmit={submit}>
        <label className="wd-label">
          Amount
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {balance !== null && (
            <button
              type="button"
              className="wd-mini"
              onClick={() => setAmount(String(balance))}
            >
              Max
            </button>
          )}
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

        <label className="wd-label">
          Memo / note (optional)
          <input
            type="text"
            placeholder="Add a note if needed"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && <div className="wd-error">Error: {error}</div>}
        {ok && <div className="wd-ok">{ok}</div>}

        <button className="wd-submit" disabled={disabled || submitting} type="submit">
          {submitting ? 'Submitting…' : 'Submit withdrawal'}
        </button>
      </form>

      <p className="wd-hint muted">
        BEP20 addresses start with 0x; verify chain and address before submitting. Transfers are irreversible.
      </p>
    </main>
  );
}
