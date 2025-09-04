import React, { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState({ normal: 0, gold: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [adTimerActive, setAdTimerActive] = useState(false);
  const [canReward, setCanReward] = useState(false);

  // Your backend endpoint; update as needed
  const API = process.env.REACT_APP_API_URL || "https://ads-cd-bot-backend.onrender.com";

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      setUser(tg.initDataUnsafe?.user);
      document.body.style.backgroundColor = tg.themeParams?.bg_color || "#667eea";
    }
  }, []);

  // Always load balance from backend for current user
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    fetch(`${API}/balance`, {
      headers: {
        Authorization: `tma ${window.Telegram.WebApp.initData}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        setBalance({ normal: data.normal_points, gold: data.gold_points });
        setIsLoading(false);
      })
      .catch(e => {
        setIsLoading(false);
        console.error("Fetch balance error:", e);
      });
  }, [user]);

  // Ad anti-cheat timer: must wait 15 seconds before credit is possible
  const startAdTimer = () => {
    setAdTimerActive(true);
    setCanReward(false);
    setTimeout(() => {
      setCanReward(true);
    }, 15000);
  };

  // Credits points only if canReward is true after 15s
  async function creditPoints(type) {
    if (!canReward) {
      alert("You must watch the full ad for 15 seconds to earn points.");
      return;
    }
    try {
      const res = await fetch(`${API}/credit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `tma ${window.Telegram.WebApp.initData}`
        },
        body: JSON.stringify({ adType: type })
      });
      if (!res.ok) throw new Error("Failed to credit");
      const data = await res.json();
      setBalance({ normal: data.normal_points, gold: data.gold_points });
      alert(`You earned ${type === "main" ? 4 : type === "side" ? 2 : 1} points!`);
    } catch (e) {
      console.error("Credit points error:", e);
      alert("Error processing reward.");
    } finally {
      setAdTimerActive(false);
      setCanReward(false);
    }
  }

  // Handler for ad button tap
  async function handleAd(type) {
    // For low ads, no timer: reward instantly
    if (type === "low") {
      await creditPoints("low");
      return;
    }
    if (adTimerActive) {
      alert("Please wait for the timer to finish before trying again.");
      return;
    }
    startAdTimer();
    // Optionally show a loading spinner or countdown here
    setTimeout(() => {
      creditPoints(type);
    }, 15000); // Only reward after 15 seconds
  }

  // Lottery ticket buying -- always update points from backend response
  async function handleBuyTicket() {
    if (balance.normal < 100) {
      alert("Need 100 points to buy a ticket!");
      return;
    }
    try {
      const res = await fetch(`${API}/buy-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${window.Telegram.WebApp.initData}`,
        },
        body: JSON.stringify({ ticketCount: 1 }),
      });
      if (!res.ok) throw new Error('Failed to buy ticket');
      const data = await res.json();
      setBalance({ normal: data.remaining_points, gold: data.gold_points || balance.gold });
      alert('Lottery ticket purchased!');
    } catch (e) {
      console.error('Ticket error', e);
      alert('Error buying ticket.');
    }
  }

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
          <button className="ad-button main" onClick={() => handleAd("main")} disabled={adTimerActive}>Main Ads (+4 points)</button>
          <button className="ad-button side" onClick={() => handleAd("side")} disabled={adTimerActive}>Side Ads (+2 points)</button>
          <button className="ad-button low" onClick={() => handleAd("low")}>Low Ads (+1 point)</button>
          {adTimerActive && <p>⏳ Please wait 15 seconds...</p>}
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
