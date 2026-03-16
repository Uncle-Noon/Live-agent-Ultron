import { EMAIL_KEY } from './config.js';

export const currentEmail        = ()      => localStorage.getItem(EMAIL_KEY) || '';
export const setEmail            = (email) => localStorage.setItem(EMAIL_KEY, email);
export const clearEmail          = ()      => localStorage.removeItem(EMAIL_KEY);
export const clearedKey          = (email) => email ? `ultronHistoryCleared_${email}` : null;
export const markHistoryCleared  = (email) => { const k = clearedKey(email); if (k) localStorage.setItem(k, String(Date.now())); };
export const getClearedAt        = (email) => { const k = clearedKey(email); return k ? parseInt(localStorage.getItem(k) || '0', 10) : 0; };
export const liftClearedFlag     = (email) => { const k = clearedKey(email); if (k) localStorage.removeItem(k); };
