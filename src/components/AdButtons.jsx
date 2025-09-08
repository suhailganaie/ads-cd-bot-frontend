import React from 'react';
import useTelegram from '../hooks/useTelegram';

export default function AdButtons({ items = [] }) {
  const { openLink } = useTelegram();
  if (!items.length) return null;

  return (
    <div className="ad-buttons">
      {items.map(ad => (
        <button
          key={ad.id}
          className="btn"
          onClick={() => openLink(ad.url)}
          title={ad.title}
        >
          {ad.title}
        </button>
      ))}
    </div>
  );
}
