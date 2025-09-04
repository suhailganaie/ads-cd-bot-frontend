import React, { useState, useEffect } from 'react';
import './App.css';

// Persisted state for balance
function usePersistedState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = usePersistedState('balance', { normal: 0, gold: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Telegram Mini App initialization and theme
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      const userData = tg.initDataUnsafe?.user;
      if (userData) setUser(userData);
      document.body.style.backgroundColor = tg.themeParams?.bg_color || '#667eea';
    }
    setIsLoading(false);
  }, []);

  // SDK guard
  const hasSdk = () =>
    typeof window !== 'undefined' && typeof window.show_9822309 === 'function';

  // Main Ads (Rewarded Popup, +4 pts)
  const handleMainAds = async () => {
    if (!hasSdk()) return alert('Ad SDK not loaded yet.');
    try {
      await window.show_9822309('pop');
      setBalance(prev => ({ ...prev, normal: prev.normal + 4 }));
      alert('You earned 4 points!');
    } catch {}
  };

  // Side Ads (Rewarded Interstitial, +2 pts)
  const handleSideAds = async () => {
    if (!hasSdk()) return alert('Ad SDK not loaded yet.');
    try {
      await window.show_9822309();
      setBalance(prev => ({ ...prev, normal: prev.normal + 2 }));
      alert('You earned 2 points!');
    } catch {}
  };

  // Automatically show In-App Interstitials (+1 pt by timer)
  useEffect(() => {
    if (!hasSdk()) return;
    window.show_9822309({
      type: 'inApp',
      inAppSettings: {
        frequency: 2,
        capping: 0.1,
        interval: 30,
        timeout: 5,
        everyPage: false
      }
    });
    // After ~35sec, automatically credit 1 point
    const timer = setTimeout(() => {
      setBalance(prev => ({ ...prev, normal: prev.normal + 1 }));
    }, 35000);
    return () => clearTimeout(timer);
  }, []);

  const handleBuyTicket = () => {
    if (balance.normal < 100) {
      alert('Need 100 points to buy a ticket!');
      return;
    }
    setBalance(prev => ({ ...prev, normal: prev.normal - 100 }));
    alert('Lottery ticket purchased!');
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading ADS_CD_BOT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎯 ADS_CD_BOT</h1>
        <p>Ad Rewards Platform</p>
      </header>

      {user && (
        <div className="user-info">
          <h2>👋 Welcome, {user.first_name}!</h2>
          <p>User ID: <code>{user.id}</code></p>
        </div>
      )}

      <div className="balance-section">
        <div className="balance-card">
          <h3>💰 Your Balance</h3>
          <div className="balance-row">
            <span>Normal Points: <strong>{balance.normal}</strong></span>
          </div>
          <div className="balance-row">
            <span>Gold Points: <strong>{balance.gold}</strong></span>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h3>🎯 Earn Points by Watching Ads</h3>
        <div className="ad-buttons">
          <button
            className="ad-button main"
            onClick={handleMainAds}
          >
            Main Ads (+4 points)
          </button>
          <button
            className="ad-button side"
            onClick={handleSideAds}
          >
            Side Ads (+2 points)
          </button>
          <button
            className="ad-button low"
            onClick={() => alert('Low Ads awarded automatically. Just use the app!')}
          >
            Low Ads (+1 point)
          </button>
        </div>
      </div>

      <div className="lottery-section">
        <h3>🎫 Lottery System</h3>
        <p>Buy tickets for monthly draws!</p>
        <button
          className="lottery-button"
          onClick={handleBuyTicket}
          disabled={balance.normal < 100}
        >
          Buy Ticket (100 points)
        </button>
        <p className="lottery-info">
          Next draw: Monthly automatic selection
        </p>
      </div>

      <footer className="footer">
        <p>🤖 Powered by ADS_CD_BOT</p>
        <p>Built with React & Telegram Mini Apps</p>
      </footer>
    </div>
  );
}
