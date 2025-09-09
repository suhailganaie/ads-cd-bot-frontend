// src/hooks/useAdexium.js
import { useCallback, useEffect, useRef } from 'react';

export function useAdexium({ wid, format = 'interstitial', onReward }) {
  const inst = useRef(null);

  useEffect(() => {
    if (!window.AdexiumWidget) return;
    const adx = new window.AdexiumWidget({
      wid,
      adFormat: format,
      // debug: true, // enable for test only
    });
    inst.current = adx;

    const onRecv = (ad) => adx.displayAd(ad);
    const onDone = () => onReward?.();

    adx.on?.('adReceived', onRecv);
    adx.on?.('adPlaybackCompleted', onDone);

    return () => {
      adx.off?.('adReceived', onRecv);
      adx.off?.('adPlaybackCompleted', onDone);
      inst.current = null;
      adx.destroy?.();
    };
  }, [wid, format, onReward]);

  return useCallback(() => {
    inst.current?.requestAd(format);
  }, [format]);
}
