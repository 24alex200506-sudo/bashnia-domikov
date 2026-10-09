/**
 * Система баланса для Telegram Mini App.
 *
 * Баланс хранится в localStorage по ключу, включающему Telegram user_id
 * (если доступен через window.Telegram.WebApp). Это позволяет каждому
 * пользователю иметь независимый баланс.
 *
 * Пополнение: администратор через бот отправляет /add @username <сумма>,
 * бот записывает данные в localStorage через postMessage или напрямую
 * через Telegram.WebApp.sendData/CloudStorage. Здесь реализован вариант
 * с localStorage и CloudStorage Telegram (если доступен).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id?: number;
            username?: string;
            first_name?: string;
          };
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

const BALANCE_KEY_PREFIX = 'domiki-balance-v1';
const BET_KEY_PREFIX = 'domiki-bet-v1';

function getUserKey(prefix: string): string {
  const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return userId ? `${prefix}-${userId}` : `${prefix}-local`;
}

function readLocalBalance(): number {
  try {
    const raw = localStorage.getItem(getUserKey(BALANCE_KEY_PREFIX));
    const val = Number(raw);
    return isFinite(val) && val >= 0 ? val : 0;
  } catch {
    return 0;
  }
}

function writeLocalBalance(amount: number): void {
  try {
    localStorage.setItem(getUserKey(BALANCE_KEY_PREFIX), String(Math.max(0, amount)));
  } catch {
    // silent
  }
}

function readLocalBet(): number {
  try {
    const raw = localStorage.getItem(getUserKey(BET_KEY_PREFIX));
    const val = Number(raw);
    return isFinite(val) && val > 0 ? val : 0;
  } catch {
    return 0;
  }
}

function writeLocalBet(amount: number): void {
  try {
    localStorage.setItem(getUserKey(BET_KEY_PREFIX), String(Math.max(0, amount)));
  } catch {
    // silent
  }
}

export interface BalanceState {
  balance: number;
  activeBet: number;       // текущая ставка (списана с баланса, вернётся с выигрышем)
  totalWon: number;        // заработано за сессию
  username: string;
  isLoaded: boolean;
}

export function useBalance() {
  const [state, setState] = useState<BalanceState>({
    balance: 0,
    activeBet: 0,
    totalWon: 0,
    username: '',
    isLoaded: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Инициализация: читаем баланс
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.ready) tg.ready();
    if (tg?.expand) tg.expand();

    const username =
      tg?.initDataUnsafe?.user?.username ||
      tg?.initDataUnsafe?.user?.first_name ||
      'Игрок';

    const userId = tg?.initDataUnsafe?.user?.id;

    async function init() {
      let serverBalance: number | null = null;

      // Пробуем загрузить баланс с сервера (если есть userId)
      if (userId) {
        try {
          const res = await fetch(`/api/balance/${userId}`);
          if (res.ok) {
            const data = await res.json() as { balance: number };
            serverBalance = data.balance;
          }
        } catch {
          // сервер недоступен — используем localStorage
        }
      }

      const localBalance = readLocalBalance();
      // Берём максимум между сервером и локальным (защита от рассинхронизации)
      const balance = serverBalance !== null
        ? Math.max(serverBalance, localBalance)
        : localBalance;

      setState({ balance, activeBet: 0, totalWon: 0, username, isLoaded: true });
    }

    init();
  }, []);

  // Синхронизация баланса в localStorage
  const persistBalance = useCallback((balance: number) => {
    writeLocalBalance(balance);
  }, []);

  /**
   * Устанавливает ставку. Ставка списывается с баланса.
   * Возвращает false если средств недостаточно.
   */
  const placeBet = useCallback((amount: number): boolean => {
    const current = stateRef.current;
    if (amount <= 0 || amount > current.balance) return false;

    const newBalance = current.balance - amount;
    persistBalance(newBalance);
    writeLocalBet(amount);

    setState(prev => ({
      ...prev,
      balance: newBalance,
      activeBet: amount,
    }));

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    return true;
  }, [persistBalance]);

  /**
   * Отменяет ставку — возвращает деньги на баланс.
   */
  const cancelBet = useCallback(() => {
    const current = stateRef.current;
    if (current.activeBet <= 0) return;

    const newBalance = current.balance + current.activeBet;
    persistBalance(newBalance);
    writeLocalBet(0);

    setState(prev => ({
      ...prev,
      balance: newBalance,
      activeBet: 0,
    }));
  }, [persistBalance]);

  /**
   * Добавляет выигрыш к балансу (за поставленный домик).
   * rewardPerHouse умножается на множитель от ставки.
   */
  const addWinnings = useCallback((amount: number) => {
    setState(prev => {
      const newBalance = prev.balance + amount;
      const newTotalWon = prev.totalWon + amount;
      persistBalance(newBalance);
      return { ...prev, balance: newBalance, totalWon: newTotalWon };
    });
  }, [persistBalance]);

  /**
   * Завершает игровой раунд — возвращает ставку на баланс (проигрыш) или
   * начисляет финальный бонус.
   */
  const endRound = useCallback((won: boolean) => {
    const current = stateRef.current;
    if (current.activeBet <= 0) return;

    if (won) {
      // Ставка уже учтена в addWinnings по ходу игры — просто сбрасываем
      writeLocalBet(0);
      setState(prev => ({ ...prev, activeBet: 0 }));
    } else {
      // Ставка потеряна — просто сбрасываем (уже списана)
      writeLocalBet(0);
      setState(prev => ({ ...prev, activeBet: 0 }));
    }
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(won ? 'success' : 'error');
  }, []);

  /**
   * Административное пополнение баланса.
   * Вызывается когда Telegram-бот передаёт параметр через start_param или
   * через window.postMessage от бота.
   */
  const adminAddBalance = useCallback((amount: number) => {
    if (amount <= 0 || !isFinite(amount)) return;
    setState(prev => {
      const newBalance = prev.balance + amount;
      persistBalance(newBalance);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      return { ...prev, balance: newBalance };
    });
  }, [persistBalance]);

  // Слушаем start_param от бота (формат: "add_500" → добавить 500₽)
  useEffect(() => {
    if (!state.isLoaded) return;
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (startParam?.startsWith('add_')) {
      const amount = Number(startParam.replace('add_', ''));
      if (isFinite(amount) && amount > 0) {
        adminAddBalance(amount);
      }
    }
  }, [state.isLoaded, adminAddBalance]);

  // Слушаем postMessage от родительского фрейма (для dev и бот-интеграции)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'domiki_add_balance') {
        const amount = Number(event.data.amount);
        if (isFinite(amount) && amount > 0) {
          adminAddBalance(amount);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [adminAddBalance]);

  return {
    ...state,
    placeBet,
    cancelBet,
    addWinnings,
    endRound,
    adminAddBalance,
  };
}

/**
 * Вычисляет множитель выигрыша на основе ставки.
 * Чем больше ставка — тем больше за каждый домик.
 *
 * Таблица:
 *  0₽      → базовая награда (10₽/домик)
 *  10-49   → ×1.5
 *  50-99   → ×2
 *  100-199 → ×3
 *  200-499 → ×5
 *  500-999 → ×8
 *  1000+   → ×12
 */
export function getBetMultiplier(bet: number): number {
  if (bet <= 0) return 1;
  if (bet < 50) return 1.5;
  if (bet < 100) return 2;
  if (bet < 200) return 3;
  if (bet < 500) return 5;
  if (bet < 1000) return 8;
  return 12;
}
