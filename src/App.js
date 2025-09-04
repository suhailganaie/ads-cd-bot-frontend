import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ normal: 0, gold: 0 });
  const [loading, setLoading] = useState(true);
  const [rewardTimerActive, setRewardTimerActive] = useState(false);
  const [canReward, setCanReward] = useState(false);
  const [rewardTimerId, setRewardTimerId] = useState(null);

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
      .then(data => setBalance({ normal: data.normal_points, gold: data.gold_points }))
      .catch(e => console.error(e));
  }, [user]);

  const startRewardTimer = () => {
    setCanReward(false);
    setRewardTimerActive(true);
    const timer = setTimeout(() => {
      setCanReward(true);
    }, 15000);
    setRewardTimerId(timer);
  };

  const clearRewardTimer = () => {
    if (rewardTimerId) clearTimeout(rewardTimerId);
    setRewardTimerId(null);
    setCanReward(false);
    setRewardTimerActive(false);
  };

  const creditReward = async (type) => {
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
      alert(`You earned ${type === 'main' ? 4 : type === 'side' ? 2 : 1} points!`);
    } catch (err) {
      alert('Failed to credit reward');
      console.error(err);
    } finally {
      clearRewardTimer();
    }
  };

  // Main Ads (Rewarded Popup)
  const handleMainAd = () => {
    if (!window.show_9822309) {
      alert('Ad SDK not loaded!');
      return;
    }
    startRewardTimer();
    window.show_9822309('pop')
      .then(() => {
        if (canReward) {
          creditReward('main');
        } else {
          alert('Watch ad for full 15s to earn reward!');
        }
      })
      .catch(() => {
        alert('Ad not completed, no reward.');
        clearRewardTimer();
      });
  };

  // Side Ads (Rewarded Interstitial)
  const handleSideAd = () => {
    if (!window.show_9822309) {
      alert('Ad SDK not loaded!');
      return;
    }
    startRewardTimer();
    window.show_9822309()
      .then(() => {
        if (canReward) {
          creditReward('side');
        } else {
          alert('Watch ad for full 15s to earn reward!');
        }
      })
      .catch(() => {
        alert('Ad not completed, no reward.');
        clearRewardTimer();
      });
  };

  // Low Ads (awarded automatically)
  const handleLowAd = () => {
    if (!window.show_9822309) {
      alert('Ad SDK not loaded!');
      return;
    }
    creditReward('low');
  };

  // Lottery ticket (backend validation)
  const buyTicket = async () => {
    if (balance.normal < 100) {
      alert('Not enough points for ticket!');
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
      if (!res.ok) throw new Error('Ticket buy failed');
      const data = await res.json();
      setBalance({ normal: data.remaining_points, gold: data.gold_points || 0 });
      alert('Ticket purchased!');
    } catch (err) {
      alert('Failed to purchase ticket');
      console.error(err);
    }
  };

  if (loading) {
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
        <h1>ADS BOT</h1>
        <p>Ad Rewards Platform</p>
      </header>
      {user && (
        <div className="user-info">
          <h2>Welcome, {user.first_name}!</h2>
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
          <button className="ad-button main" onClick={handleMainAd} disabled={rewardTimerActive}>Main Ads (+4 points)</button>
          <button className="ad-button side" onClick={handleSideAd} disabled={rewardTimerActive}>Side Ads (+2 points)</button>
          <button className="ad-button low" onClick={handleLowAd}>Low Ads (+1 point)</button>
          {rewardTimerActive && <p>⏳ Please wait 15 seconds while ad is running...</p>}
        </div>
      </div>
      <div className="lottery-section">
        <h3>🎫 Lottery System</h3>
        <p>Buy tickets for monthly draws!</p>
        <button className="lottery-button" onClick={buyTicket} disabled={balance.normal < 100}>Buy Ticket (100 points)</button>
        <p className="lottery-info">Next draw: Monthly automatic selection</p>
      </div>
      <footer className="footer">
        <p>Powered by ADS BOT</p>
        <p>Built with React & Telegram Mini Apps</p>
      </footer>
    </div>
  );
}
