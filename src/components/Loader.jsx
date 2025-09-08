import React from 'react';

export default function Loader({
  label = 'Loading',
  size = 28,
  inline = false
}) {
  const style = inline
    ? { display: 'inline-flex', alignItems: 'center', gap: 8 }
    : { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' };

  return (
    <div style={style} aria-busy="true" aria-live="polite" aria-label={label}>
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          border: `${Math.max(2, Math.round(size / 7))}px solid rgba(0,0,0,0.15)`,
          borderTopColor: 'currentColor',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {!inline && <span className="muted" style={{ marginLeft: 12 }}>{label}…</span>}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
