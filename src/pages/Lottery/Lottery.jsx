export default function Lottery() {
  return (
    <div className="card">
      <h2>Lottery</h2>
      <p className="muted">Join daily draws with tickets. Spins coming soon.</p>
    </div>
  );
}

// src/pages/Invite/Invite.jsx
export default function Invite() {
  const link = 'https://example.com/r/ABC123';
  return (
    <div className="card">
      <h2>Invite Friends</h2>
      <p className="muted">Share a referral link and earn bonuses.</p>
      <div className="invite-box">
        <input readOnly value={link} />
        <button onClick={async () => {
          try { await navigator.clipboard.writeText(link); } catch {}
        }}>Copy Link</button>
      </div>
    </div>
  );
}
