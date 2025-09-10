// src/pages/Withdraw/Withdraw.jsx
import React, { useEffect } from 'react';
import '../../styles/withdraw.css'; // keeps typography + card look from your existing CSS

export default function Withdraw() {
  // Keep Telegram webview stable and expanded, same as other pages
  useEffect(() => {
    try { window?.Telegram?.WebApp?.ready?.(); window?.Telegram?.WebApp?.expand?.(); } catch {}
  }, []); // stable viewport [web:4106]

  return (
    <>
      <div className="wd-coming-card">
        <h2 className="wd-title">Withdraw</h2>

        <div className="wd-coming">
          <div className="wd-badge"></div>
          <p className="wd-note">
            Withdrawals will open soon.
          </p>
        </div>
      </div>

      {/* Safe-area spacer so the card stays above the fixed bottom nav */}
      <div className="page-end-spacer" />
    </>
  );
}
