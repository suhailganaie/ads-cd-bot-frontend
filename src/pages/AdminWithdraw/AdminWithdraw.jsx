// src/pages/AdminWithdraw/AdminWithdraw.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../../styles/adminwithdraw.css';

const API = import.meta.env?.VITE_API_BASE || '';

export default function AdminWithdraw({ token }) {
  const tg = window?.Telegram?.WebApp;
  useEffect(() => { try { tg?.ready?.(); tg?.expand?.(); } catch {} }, []); // stable viewport [4]

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  ); // Bearer header [5]

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState('');
  const [reason, setReason] = useState('');

  const refresh = useCallback(async () => {
    if (!API || !token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/withdrawals/pending?limit=50&offset=0`, { headers: authHeaders });
      const d = await r.json().catch(() => ({}));
      setRows(Array.isArray(d?.items) ? d.items : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [API, token, authHeaders]); // pending list [3]

  useEffect(() => { refresh(); }, [refresh]);

  const approve = async (wid) => {
    if (!wid) return;
    await fetch(`${API}/withdrawals/${wid}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
    }).catch(() => {});
    refresh();
  };

  const reject = async (wid, why) => {
    if (!wid) return;
    await fetch(`${API}/withdrawals/${wid}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ reason: why || undefined }),
    }).catch(() => {});
    refresh();
  };

  return (
    <>
      <div className="aw-card">
        <div className="aw-head">
          <h3 className="aw-title">Withdraw admin</h3>
          <button className="aw-btn ghost" onClick={refresh} disabled={loading}>Refresh</button>
</div>

        <div className="aw-quick">
          <input
            className="aw-input"
            placeholder="Withdrawal ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            inputMode="numeric"
          />
          <button className="aw-btn primary" onClick={() => approve(id)}>Approve</button>
          <input
            className="aw-input"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button className="aw-btn" onClick={() => reject(id, reason)}>Reject</button>
        </div>

        <ul className="aw-list">
          {rows.map((r) => (
            <li key={r.id} className="aw-item">
              <div className="aw-row">
                <span className="aw-id">#{r.id}</span>
                <span className="aw-amt">{r.tokens} tokens</span>
              </div>
              <div className="aw-meta">
                <span className="aw-addr">{r.address || '—'}</span>
                <span className="aw-user">@{r.username || r.telegram_id}</span>
                <span className="aw-time">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="aw-actions">
                <button className="aw-btn primary" onClick={() => approve(r.id)}>Approve</button>
                <button className="aw-btn" onClick={() => reject(r.id)}>Reject</button>
              </div>
            </li>
          ))}
          {!loading && rows.length === 0 && (
            <li className="aw-empty">No pending withdrawals</li>
          )}
        </ul>
      </div>

      <div className="page-end-spacer" />
    </>
  );
}
