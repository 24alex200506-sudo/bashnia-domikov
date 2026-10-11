import { useState } from 'react';
import App from './App';
import { useBalance } from './game/useBalance';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id?: number;
            username?: string;
            first_name?: string;
            photo_url?: string;
          };
        };
      };
    };
  }
}

export default function Menu() {
  const [inGame, setInGame] = useState(false);
  const { balance } = useBalance();

  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const photoUrl = user?.photo_url;
  const displayName = user?.username || user?.first_name || 'Игрок';

  if (inGame) return <App />;

  return (
    <div className="menu-shell">

      {/* ── Топ-бар ── */}
      <div className="menu-topbar">
        {/* Баланс */}
        <div className="menu-balance-pill">
          <span className="menu-balance-icon">₽</span>
          <span className="menu-balance-val">
            {balance.toLocaleString('ru', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="menu-balance-arrow">▾</span>
        </div>

        {/* Кнопка Пополнить */}
        <button className="menu-topup-btn">Пополнить</button>

        {/* Аватар из Telegram */}
        <div className="menu-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} className="menu-avatar-img" />
          ) : (
            <span className="menu-avatar-initials">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="menu-avatar-dot" />
        </div>
      </div>

      {/* ── Логотип ── */}
      <div className="menu-logo-row">
        <span className="menu-logo">🎰 Nekit Casino</span>
      </div>

      {/* ── Карточка TOWER ── */}
      <div className="menu-content">
        <button className="game-card" onClick={() => setInGame(true)}>
          <span className="card-badge">🔥 HOT</span>

          <div className="card-preview">
            <div className="card-sky" />
            <div className="card-sun" />
            <div className="card-cloud" />
            <div className="card-tower">
              <div className="card-house" style={{ background: '#ef8bb4', width: 54, '--roof': '#c95f8d' } as React.CSSProperties} />
              <div className="card-house" style={{ background: '#6bc8be', width: 62, '--roof': '#338f91' } as React.CSSProperties} />
              <div className="card-house" style={{ background: '#f5c66e', width: 70, '--roof': '#e18d49' } as React.CSSProperties} />
              <div className="card-house card-house--base" style={{ background: '#68a9dd', width: 80, '--roof': '#3978b8' } as React.CSSProperties} />
            </div>
            <span className="card-mult card-mult--1">×2.5</span>
            <span className="card-mult card-mult--2">×5.0</span>
            <span className="card-mult card-mult--3">×12</span>
          </div>

          <div className="card-info">
            <span className="card-title">TOWER</span>
            <span className="card-sub">Build & Earn</span>
          </div>

          <div className="card-arrow">▶</div>
        </button>
      </div>
    </div>
  );
}
