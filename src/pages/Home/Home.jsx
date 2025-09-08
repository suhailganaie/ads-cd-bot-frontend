import React, { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    try { tg?.expand?.(); tg?.ready?.(); } catch {}
  }, []); // Use full Mini App height for a true full-page section. [web:3300][web:3590]

  return (
    <main className="home-page">
      <h1 className="home-title">ADS BOT</h1>
      <p className="home-subtitle">Ad Rewards Platform</p>

      <div className="home-welcome">
        <p>👋 Welcome to ADS BOT</p>
        <p>Turn time into tokens — watch ads and invite friends.</p>

        <p>🎬 Watch ads to earn points instantly.</p>
        <p>👥 Invite friends to earn even more.</p>
        <p>💱 Convert points into the official token.</p>

        <p>Start earning in minutes — no crypto knowledge needed.</p>
        <p>👉 Let’s get started!</p>
      </div>
    </main>
  );
}
