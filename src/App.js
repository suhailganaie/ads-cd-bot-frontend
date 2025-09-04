import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ normal: 0, gold: 10 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Get user data from Telegram
      const userData = tg.initDataUnsafe?.user;
      if (userData) {
        setUser(userData);
      }
      
      // Apply Telegram theme
      document.body.style.backgroundColor = tg.backgroundColor || '#667eea';
    }
    
    setIsLoading(false);
  }, []);

  const handleAdWatch = (adType) => {
    const points = adType === 'main' ? 4 : adType === 'side' ? 2 : 1;
    setBalance(prev => ({ ...prev, normal: prev.normal + points }));
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(`You earned ${points} points! 🎉`);
    } else {
      alert(`You earned ${points} points! 🎉`);
    }
  };

  const handleBuyTicket = () => {
    if (balance.normal >= 100) {
      setBalance(prev => ({ ...prev, normal: prev.normal - 100 }));
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Lottery ticket purchased! 🎫');
      } else {
        alert('Lottery ticket purchased! 🎫');
      }
    } else {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Need 100 points to buy a ticket!');
      } else {
        alert('Need 100 points to buy a ticket!');
      }
    }
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
            onClick={() => handleAdWatch('main')}
          >
            Main Ads (+4 points)
          </button>
          <button 
            className="ad-button side" 
            onClick={() => handleAdWatch('side')}
          >
            Side Ads (+2 points)
          </button>
          <button 
            className="ad-button low" 
            onClick={() => handleAdWatch('low')}
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

      <div className="referral-section">
        <h3>📢 Share & Earn</h3>
        <p>Invite friends to earn more rewards!</p>
        <button 
          className="share-button"
          onClick={() => {
            if (window.Telegram?.WebApp) {
              const shareText = `🎯 Join ADS_CD_BOT and earn points by watching ads!\n\n💰 Get 10 Gold Points for signing up\n🎫 Monthly lottery draws\n📱 Easy to use Mini App\n\nJoin me: https://t.me/ADS_Cd_bot?start=${user?.id || ''}`;
              window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=https://t.me/ADS_Cd_bot&text=${encodeURIComponent(shareText)}`);
            }
          }}
        >
          📱 Share with Friends
        </button>
      </div>

      <footer className="footer">
        <p>🤖 Powered by ADS_CD_BOT</p>
        <p>Built with React & Telegram Mini Apps</p>
      </footer>
    </div>
  );
}

export default App;

