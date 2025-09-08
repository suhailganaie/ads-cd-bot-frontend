// src/hooks/useTelegram.js
import { useEffect, useMemo, useState } from 'react';

export default function useTelegram() {
  const [webApp, setWebApp] = useState(null); // Telegram WebApp instance [web:2626]  
  const [tgUser, setTgUser] = useState(null); // Logged-in Telegram user (if inside Telegram) [web:2626]  
  const [startParam, setStartParam] = useState(null); // Deep-link param if present [web:2769]  

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (!tg) return; // Guard when running outside Telegram (local dev) [web:2716]  
    try {
      if (typeof tg.ready === 'function') tg.ready(); // Recommended init for Mini Apps [web:2626]  
      if (typeof tg.expand === 'function') tg.expand(); // Expand viewport for better UX [web:2632]  
    } catch {}
    setWebApp(tg);
    const unsafe = tg?.initDataUnsafe || null; // Client-side convenience; server must validate signatures [web:2626]  
    const u = unsafe?.user || null;
    if (u) setTgUser(u); // { id, username, first_name, ... } [web:2767]  
    setStartParam(unsafe?.start_param || null); // Optional campaign/referral code [web:2769]  
  }, []); // One-time initialization pattern for effects [web:2772]  

  const theme = useMemo(() => {
    const p = webApp?.themeParams || {};
    return {
      bgColor: p.bg_color,
      textColor: p.text_color,
      hintColor: p.hint_color,
      linkColor: p.link_color,
      buttonColor: p.button_color,
      buttonTextColor: p.button_text_color,
      secondaryBgColor: p.secondary_bg_color,
    };
  }, [webApp]); // Derive theme values to style UI consistently with Telegram [web:2638]  

  const openLink = (url) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer'); // Prevent reverse-tabnabbing for external links [web:2538]  
    } catch {}
  };

  return { webApp, tgUser, theme, startParam, openLink }; // Expose helpers and data to components [web:2716]  
}
