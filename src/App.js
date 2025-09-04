import React, { useState, useEffect } from 'react';
import './App.css';

// Persisted state for balance (optional, balances are always synced with backend)
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

  // Recommended: put backend URL in .env using REACT_APP_API_URL, but hardcoded here for demo
  const API = process.env.REACT_APP_API_URL || 'https://ads-cd-bot-backend.onrender.com';

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      const userData = tg.initDataUnsafe?.user;
      if (userData) setUser(userData);
      document.body.style.backgroundColor = tg.themeParams?.bg_color || '#667eea';
    }
  }, []);

  // Fetch balance from backend when user loads
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    // Fetch balance from backend
    fetch(`${API}/balance`, {
      headers: {
        Authorization: `tma ${window.Telegram.WebApp.initData}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setBalance({ normal: data.normal_points, gold: data.gold_points });
      setIsLoading(false);
    })
    .catch(e => {
      setIsLoading(false);
      console.error('Error fetching balance:', e);
    });
  }, [user]);

  // --- Ad integration ---

  // Check Ad SDK is loaded
  const hasSdk = () => typeof window !== 'undefined' && typeof window.show_9822309 === 'function';

  // Credit points for watched ad (calls backend)
  async function creditPoints(type) {
    try {
      const res = await fetch(`${API}/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${window.Telegram.WebApp.initData}`
        },
        body: JSON.stringify({ adType: type })
      });
      const data = await res.json();
      if (data.normal_points && data.gold_points !== undefined) {
        setBalance({ normal: data.normal_points, gold: data.gold_points });
      }
    } catch (e) {
      console.error('Credit error', e);
    }
  }

  // Ad button handlers
  async function handleMainAds() {
    if (!hasSdk()) return alert("Ad SDK not loaded yet.");
    await window.show_9822309('pop');
    await creditPoints('main');
    alert('You earned 4 points!');
  }
  async function handleSideAds() {
    if (!hasSdk()) return alert("Ad SDK not loaded yet.");
    await window.show_9822309();
    await creditPoints('side');
    alert('You earned 2 points!');
  }
  function handleLowAds() {
    alert('Low Ads give 1 point automatically on backend!');
    creditPoints('low');
  }

  // Buy lottery ticket via backend
  async function handleBuyTicket() {
    if (balance.normal < 100) {
      alert('Need 100 points to buy a ticket!');
      return;
    }
    try {
      const res = await fetch(`${API}/buy-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${window.Telegram.WebApp.initData}`
        },
        body: JSON.stringify({ ticketCount: 1 })
      });
      const data = await res.json();
      setBalance({ normal: data.remaining_points, gold: balance.gold });
      alert('Lottery ticket purchased!');
    } catch (e) {
      console.error('Ticket error', e);
    }
  }

  // --- UI ---
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
      {user &&
        <div className="user-info">
          <h2>👋 Welcome, {user.first_name}!</h2>
          <p>User ID: <code>{user.id}</code></p>
        </div>
      }
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
          <button className="ad-button main" onClick={handleMainAds}>Main Ads (+4 points)</button>
          <button className="ad-button side" onClick={handleSideAds}>Side Ads (+2 points)</button>
          <button className="ad-button low" onClick={handleLowAds}>Low Ads (+1 point)</button>
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
