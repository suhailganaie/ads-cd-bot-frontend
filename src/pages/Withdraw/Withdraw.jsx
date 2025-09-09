import React, { useEffect, useMemo, useState, useCallback } from 'react';

const API = import.meta.env?.VITE_API_BASE || '';

export default function Withdraw() {
  const tg = window?.Telegram?.WebApp;
  const unsafe = tg?.initDataUnsafe || {};
  const initDataRaw = tg?.initData || '';
  const userId = unsafe?.user?.id ? String(unsafe.user.id) : '';

  // Use same auth scheme as Invite: prefer x-telegram-id for this project
  const authHeaders = useMemo(() => {
    const h = {};
    if (userId) h['x-telegram-id'] = userId;
    // If backend also supports tma, you may enable:
    // if (initDataRaw) h['Authorization'] = `tma ${initDataRaw}`;
    return h;
  }, [userId, initDataRaw]); // Match existing endpoints identity pattern. [web:3346][web:3332]

  useEffect(() => {
    try { tg?.expand?.(); tg?.ready?.(); } catch {}
  }, []);

  // Load balance (points) to guide the amount entry
  const [balance, setBalance] = useState<number | null>(null);
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
  }, [API, authHeaders]); // Same header consistency as other screens. [web:3346]

  useEffect(() => { fetchBalance(); }, [fetchBalance]); // on mount [web:3346]

  // Form state (BEP20/ERC20)
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState(''); // optional memo/tag if needed later
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Basic BEP20/ETH-like address check (0x-prefixed, 40 hex)
  const isEvmAddress = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a.trim());

  const disabled = useMemo(() => {
    const v = Number(amount);
    if (!API || !v || v <= 0) return true;
    if (!address || !isEvmAddress(address)) return true;
    if (balance !== null && v > balance) return true;
    return false;
  }, [API, amount, address, balance]); // Client-side guard; server validates too. [web:3600]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(null);
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/withdrawals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          method: 'BEP20',                 // explicit network/method for backend
          chain: 'bsc',                    // or 'bep20' if your backend expects this
          token_standard: 'erc20',         // many backends alias BEP20 as erc20
          amount: Number(amount),          // backend will convert to token units
          address: address.trim(),
          memo: note || undefined
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `withdraw_failed_${res.status}`);
      } else {
        setOk('Withdrawal request submitted');
        setAmount(''); setAddress(''); setNote('');
        fetchBalance(); // refresh balance after request
      }
    } catch (e: any) {
      setError(String(e?.message || e));
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
        <strong>{loadingBal ? '…' : balance ?? '—'}</strong>
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
        BEP20 addresses are EVM style and start with 0x; double-check chain and address before submitting as transfers are irreversible.
      </p>
    </main>
  );
}
