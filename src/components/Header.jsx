import React from 'react';
import useTelegram from '../hooks/useTelegram';

export default function Header({ title = 'ADS BOT', subtitle = 'Ad Rewards Platform' }) {
  const { theme } = useTelegram();
  const style = {
    background: theme.secondaryBgColor || 'transparent',
    color: theme.textColor || 'inherit',
  };

  return (
    <header className="header" style={style}>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>
    </header>
  );
}
