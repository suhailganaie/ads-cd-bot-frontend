import { useEffect, useMemo, useState } from 'react';

export default function useTelegram() {
  const [webApp, setWebApp] = useState(null);
  const [tgUser, setTgUser] = useState(null);

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (!tg) return;
    try {
      if (typeof tg.ready === 'function') tg.ready();
      if (typeof tg.expand === 'function') tg.expand();
    } catch {}
    setWebApp(tg);
    const u = tg?.initDataUnsafe?.user || null;
    if (u) setTgUser(u);
  }, []); // Telegram init and expansion are typical for Mini Apps [web:2632][web:2716].

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
  }, [webApp]); // Reading Telegram theme params helps match app styling [web:2638].

  const openLink = (url) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {}
  }; // Use noopener/noreferrer to prevent reverse-tabnabbing with target=_blank [web:2538][web:2532].

  return { webApp, tgUser, theme, openLink };
}
