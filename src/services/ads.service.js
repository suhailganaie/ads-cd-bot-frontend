// src/services/ads.service.js
import { get, post } from './apiClient';

// If ads router exposes list endpoints (adjust as implemented)
export const fetchMainAds = () => get('/ads/main');   // e.g., GET /api/ads/main
export const fetchSideAds = () => get('/ads/side');   // e.g., GET /api/ads/side

// Example: claim/view ad reward (if you implement such an endpoint)
export const rewardForAd = (adId) =>
  post('/ads/reward', { ad_id: adId });               // e.g., POST /api/ads/reward
