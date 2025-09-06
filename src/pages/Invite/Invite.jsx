import { useMemo, useState } from 'react';

export default function Invite() {
  // Generate/receive a referral code; replace with real user code when available
  const referralCode = 'ABC123';
  const link = useMemo(() => `https://example.com/r/${referralCode}`, [referralCode]);

  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for older browsers
      const temp = document.createElement('input');
      temp.value = link;
      document.body.appendChild(temp);
      temp.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
      document.body.removeChild(temp);
    }
  };

  return (
    <div className="card">
      <h2>Invite Friends</h2>
      <p className="muted">
        Share a referral link and earn bonuses when friends join and complete tasks.
      </p>

      <div className="invite-box" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          readOnly
          value={link}
          aria-label="Referral link"
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #9993',
            background: '#ffffff14',
            color: '#fff'
          }}
        />
        <button
          type="button"
          onClick={copy}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: 0,
            background: '#04AA6D',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Tips</h3>
        <ul style={{ margin: '8px 0 0 16px' }}>
          <li>Offer a bonus to both inviter and friend to increase conversions.</li>
          <li>Add a clear CTA and show progress toward rewards.</li>
          <li>Display recent successful invites for social proof.</li>
        </ul>
      </div>
    </div>
  );
}
