import React from 'react';

export default function BalanceCard({ points = 0, subtitle = 'Available points' }) {
  return (
    <div className="card balance-card">
      <div className="balance-header">
        <h3>{points}</h3>
        <span className="muted">{subtitle}</span>
      </div>
    </div>
  );
}
