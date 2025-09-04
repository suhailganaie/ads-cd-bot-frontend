import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ normal: 0, gold: 0 });
  const [loading, setLoading] = useState(true);
  const [rewardTimerActive, setRewardTimerActive] = useState(false);
  const [canReward, setCanReward] = useState(false);
  const [rewardTimerId, setRewardTimerId] = useState(null);

  // Change to your actual backend endpoint
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

    // In-App Interstitial setup (auto ads)
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
    }, 15000); // 15 seconds
    setRewardTimerId(timer);
  };

  const clearRewardTimer = () => {
    if (rewardTimerId) clearTimeout(rewardTimerId);
    setRewardTimerId(null);
    setCanReward(false);
    setRewardTimerActive(false);
  };

  // Backend points credit, only after reward conditions
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

  // Handle Rewarded Popup (main ad)
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

  // Handle Rewarded Interstitial (side ad)
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

  // Low Ads (awarded automatically, if needed—timer not required)
  const handleLowAd = () => {
    if (!window.show_9822309) {
      alert('Ad SDK not loaded!');
      return;
    }
    // Ad shows in "inApp" mode automatically; you may want to increment 1pt by backend here if desired:
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

  if (loading) return <div className="app"><p>Loading...</p></div>;

  return (
    <div className="app">
      <header>
        <h1>ADS BOT</h1>
        <p>Ad Rewards Platform</p>
      </header>
      {user && (
        <section>
          <h2>Welcome, {user.first_name}</h2>
          <p>User ID: {user.id}</p>
        </section>
      )}
      <section>
        <h3>Your Balance</h3>
        <p>Normal Points: {balance.normal}</p>
        <p>Gold Points: {balance.gold}</p>
      </section>
      <section>
        <h3>Earn Points by Watching Ads</h3>
        <button onClick={handleMainAd} disabled={rewardTimerActive}>Main Ads (+4)</button>
        <button onClick={handleSideAd} disabled={rewardTimerActive}>Side Ads (+2)</button>
        <button onClick={handleLowAd}>Low Ads (+1) — Auto</button>
        {rewardTimerActive && <p>⏳ Please wait 15 seconds while ad is running...</p>}
      </section>
      <section>
        <h3>Lottery System</h3>
        <button onClick={buyTicket} disabled={balance.normal < 100}>Buy Ticket (100)</button>
        <p>Next draw: Monthly automatic</p>
      </section>
      <footer>
        <p>Powered by ADS BOT</p>
        <p>Built with React & Telegram Mini Apps</p>
      </footer>
    </div>
  );
}
