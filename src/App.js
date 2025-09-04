import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ normal: 0, gold: 0 });
  const [loading, setLoading] = useState(true);
  const [rewardInProgress, setRewardInProgress] = useState(false);

  const API = process.env.REACT_APP_API_URL || 'https://ads-cd-bot-backend.onrender.com';

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      setUser(tg.initDataUnsafe?.user);
      document.body.style.backgroundColor = tg.themeParams?.bg_color || '#667eea';
    }
    setLoading(false);

    // In-App Interstitial (auto show, no reward)
    if (window.show_9822309) {
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
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/balance`, {
      headers: { Authorization: `tma ${window.Telegram.WebApp.initData}` }
    })
      .then(res => res.json())
      .then(data =>
        setBalance({ normal: data.normal_points, gold: data.gold_points })
      )
      .catch(e => console.error(e));
  }, [user]);

  // Backend points credit
  const creditReward = async (type, points) => {
    try {
      const res = await fetch(`${API}/credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${window.Telegram.WebApp.initData}`
        },
        body: JSON.stringify({ adType: type })
      });
      if (!res.ok) throw new Error('Credit failed');
      const data = await res.json();
      setBalance({ normal: data.normal_points, gold: data.gold_points });
      alert(`Earned ${points} points!`);
    } catch (err) {
      alert('Failed to credit reward');
      console.error(err);
    }
  };

  // Rewarded Interstitial
  const handleInterstitialAd = async () => {
    if (rewardInProgress) return;
    setRewardInProgress(true);
    try {
      await window.show_9822309();
      await creditReward('interstitial', 1);
    } catch (err) {
      alert('Ad not completed or failed.');
    }
    setRewardInProgress(false);
  };

  // Rewarded Popup
  const handlePopupAd = async () => {
    if (rewardInProgress) return;
    setRewardInProgress(true);
    try {
      await window.show_9822309('pop');
      await creditReward('popup', 2);
    } catch (err) {
      alert('Ad not completed or failed.');
    }
    setRewardInProgress(false);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading ADS BOT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ADS BOT</h1>
        <p>Ad Rewards Platform</p>
      </header>
      {user &&
        <div className="user-info">
          <h2>Welcome, {user.first_name}!</h2>
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
        <h3>Earn Points</h3>
        <div className="ad-buttons">
          <button
            className="ad-button popup"
            onClick={handlePopupAd}
            disabled={rewardInProgress}
          >
            Earn Points (2)
          </button>
          <button
            className="ad-button interstitial"
            onClick={handleInterstitialAd}
            disabled={rewardInProgress}
          >
            Earn Points (1)
          </button>
        </div>
      </div>
      <footer className="footer">
        <p>Powered by ADS BOT</p>
        <p>Built with React & Telegram Mini Apps</p>
      </footer>
    </div>
  );
}
