/**
 * Система баланса для Telegram Mini App.
 *
 * Механика:
 * - Баланс = 0 по умолчанию, пополняет только админ через /add
 * - Ставка списывается с баланса сразу при нажатии "Поставить"
 * - Выигрыш за каждый домик идёт в pendingWin (банк) — НЕ на баланс
 * - Кнопка "Забрать" переносит весь банк на баланс
 * - При проигрыше банк сбрасывается (ставка уже списана)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: { id?: number; username?: string; first_name?: string };
          start_param?: string;
        };
        ready?: () => void;
        expand?: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

const BALANCE_KEY = 'domiki-balance-v2';
const BET_KEY     = 'domiki-bet-v2';

function getUserSuffix(): string {
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return id ? `-${id}` : '-local';
}

function loadNum(key: string): number {
  try {
    const v = Number(localStorage.getItem(key + getUserSuffix()));
    return isFinite(v) && v >= 0 ? v : 0;
  } catch { return 0; }
}

function saveNum(key: string, val: number): void {
  try { localStorage.setItem(key + getUserSuffix(), String(Math.max(0, val))); } catch { /* */ }
}

export interface BalanceState {
  balance: number;      // текущий баланс (что доступно для ставки)
  activeBet: number;    // активная ставка (уже списана с баланса)
  pendingWin: number;   // банк — накопленный выигрыш, ещё не забранный
  username: string;
  isLoaded: boolean;
}

export function useBalance() {
  const [state, setState] = useState<BalanceState>({
    balance: 0, activeBet: 0, pendingWin: 0, username: '', isLoaded: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  // Инициализация
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
    const username = tg?.initDataUnsafe?.user?.username
      || tg?.initDataUnsafe?.user?.first_name
      || 'Игрок';

    const userId = tg?.initDataUnsafe?.user?.id;

    async function init() {
      let serverBalance: number | null = null;
      if (userId) {
        try {
          const res = await fetch(`/api/balance/${userId}`);
          if (res.ok) {
            const data = await res.json() as { balance: number };
            serverBalance = data.balance;
          }
        } catch { /* сервер недоступен */ }
      }
      const localBalance = loadNum(BALANCE_KEY);
      const balance = serverBalance !== null
        ? Math.max(serverBalance, localBalance)
        : localBalance;
      setState({ balance, activeBet: 0, pendingWin: 0, username, isLoaded: true });
    }
    init();
  }, []);

  /** Поставить ставку — списывается с баланса */
  const placeBet = useCallback((amount: number): boolean => {
    const cur = stateRef.current;
    if (amount <= 0 || amount > cur.balance || cur.activeBet > 0) return false;
    const newBalance = cur.balance - amount;
    saveNum(BALANCE_KEY, newBalance);
    saveNum(BET_KEY, amount);
    setState(p => ({ ...p, balance: newBalance, activeBet: amount }));
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    return true;
  }, []);

  /** Отменить ставку — вернуть деньги */
  const cancelBet = useCallback(() => {
    const cur = stateRef.current;
    if (cur.activeBet <= 0) return;
    const newBalance = cur.balance + cur.activeBet;
    saveNum(BALANCE_KEY, newBalance);
    saveNum(BET_KEY, 0);
    setState(p => ({ ...p, balance: newBalance, activeBet: 0 }));
  }, []);

  /** Добавить выигрыш в банк (не на баланс!) */
  const addToPending = useCallback((amount: number) => {
    setState(p => ({ ...p, pendingWin: p.pendingWin + amount }));
  }, []);

  /** Забрать банк на баланс */
  const collectWin = useCallback(() => {
    const cur = stateRef.current;
    if (cur.pendingWin <= 0) return;
    const newBalance = cur.balance + cur.pendingWin;
    saveNum(BALANCE_KEY, newBalance);
    setState(p => ({ ...p, balance: newBalance, pendingWin: 0, activeBet: 0 }));
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  }, []);

  /** Конец раунда — сбросить ставку и банк (проигрыш) */
  const endRound = useCallback(() => {
    saveNum(BET_KEY, 0);
    setState(p => ({ ...p, activeBet: 0, pendingWin: 0 }));
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
  }, []);

  /** Админское пополнение */
  const adminAdd = useCallback((amount: number) => {
    if (amount <= 0 || !isFinite(amount)) return;
    setState(prev => {
      const newBalance = prev.balance + amount;
      saveNum(BALANCE_KEY, newBalance);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      return { ...prev, balance: newBalance };
    });
  }, []);

  // start_param от бота: "add_500"
  useEffect(() => {
    if (!state.isLoaded) return;
    const sp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (sp?.startsWith('add_')) {
      const amount = Number(sp.replace('add_', ''));
      if (isFinite(amount) && amount > 0) adminAdd(amount);
    }
  }, [state.isLoaded, adminAdd]);

  // postMessage от бота
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'domiki_add_balance') {
        const amount = Number(e.data.amount);
        if (isFinite(amount) && amount > 0) adminAdd(amount);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [adminAdd]);

  return { ...state, placeBet, cancelBet, addToPending, collectWin, endRound, adminAdd };
}

/**
 * Множитель выигрыша от ставки:
 * 0    → ×1   (10₽/домик)
 * 10+  → ×1.5
 * 50+  → ×2
 * 100+ → ×3
 * 200+ → ×5
 * 500+ → ×8
 * 1000+→ ×12
 */
export function getBetMultiplier(bet: number): number {
  if (bet <= 0)    return 1;
  if (bet < 50)    return 1.5;
  if (bet < 100)   return 2;
  if (bet < 200)   return 3;
  if (bet < 500)   return 5;
  if (bet < 1000)  return 8;
  return 12;
}
