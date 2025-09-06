// src/pages/Lottery/Lottery.jsx
import { useState } from 'react';

export default function Lottery() {
  // Mock ticket state; replace with real value from API/store later
  const [tickets, setTickets] = useState(0);
  const [status, setStatus] = useState('');

  const addTicket = (n = 1) => setTickets(t => Math.min(9999, t + n));
  const enterDraw = () => {
    if (tickets < 1) {
      setStatus('Not enough tickets to enter.');
      return;
    }
    setTickets(t => t - 1);
    setStatus('Entered the daily draw! Good luck!');
    setTimeout(() => setStatus(''), 1500);
  };

  return (
    <div className="card">
      <h2>Lottery</h2>
      <p className="muted">Use tickets to join the daily draw. Spins and instant wins are coming soon
        
