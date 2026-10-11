import { useState } from 'react';
import App from './App';
import { useBalance } from './game/useBalance';

declare global {
  interface Window {
    Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number; username?: string; first_name?: string; photo_url?: string; }; }; }; };
  }
}

export default function Menu() {
  const [inGame, setInGame] = useState(false);
  const { balance } = useBalance();
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const photoUrl = user?.photo_url;
  const displayName = user?.username || user?.first_name || 'Player';

  if (inGame) return <App />;

  return (
    <div className="m-shell">
      {/* Фоновые декорации */}
      <div className="m-bg-orb m-bg-orb--1" />
      <div className="m-bg-orb m-bg-orb--2" />
      <div className="m-bg-orb m-bg-orb--3" />
      <div className="m-bg-grid" />

      {/* Топ-бар */}
      <div className="m-topbar">
        <div className="m-balance">
          <div className="m-balance-icon">₽</div>
          <span className="m-balance-val">{balance.toLocaleString('ru', { minimumFractionDigits: 2 })}</span>
          <span className="m-balance-chevron">⌄</span>
        </div>
        <button className="m-topup">+ Пополнить</button>
        <div className="m-avatar">
          {photoUrl
            ? <img src={photoUrl} alt={displayName} />
            : <span>{displayName.slice(0,1).toUpperCase()}</span>}
          <div className="m-avatar-ring" />
          <div className="m-avatar-online" />
        </div>
      </div>

      {/* Логотип */}
      <div className="m-hero">
        <div className="m-logo-wrap">
          <div className="m-logo-icon-wrap">
            {/* Игральные кости — красивая 3D иконка казино */}
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="8" width="24" height="24" rx="5" fill="url(#dice1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
              <rect x="16" y="14" width="24" height="24" rx="5" fill="url(#dice2)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
              {/* Точки на первом кубике */}
              <circle cx="9" cy="15" r="2.2" fill="white" opacity="0.9"/>
              <circle cx="17" cy="15" r="2.2" fill="white" opacity="0.9"/>
              <circle cx="9" cy="20" r="2.2" fill="white" opacity="0.9"/>
              <circle cx="17" cy="20" r="2.2" fill="white" opacity="0.9"/>
              <circle cx="9" cy="25" r="2.2" fill="white" opacity="0.9"/>
              <circle cx="17" cy="25" r="2.2" fill="white" opacity="0.9"/>
              {/* Точки на втором кубике */}
              <circle cx="28" cy="28" r="2" fill="white" opacity="0.85"/>
              <circle cx="34" cy="28" r="2" fill="white" opacity="0.85"/>
              <circle cx="31" cy="31" r="2" fill="white" opacity="0.85"/>
              <defs>
                <linearGradient id="dice1" x1="2" y1="8" x2="26" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7b2ff7"/>
                  <stop offset="100%" stopColor="#4a00c8"/>
                </linearGradient>
                <linearGradient id="dice2" x1="16" y1="14" x2="40" y2="38" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ff6b6b"/>
                  <stop offset="100%" stopColor="#c0392b"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="m-logo-title">Nekit Casino</div>
            <div className="m-logo-sub">Play · Win · Collect</div>
          </div>
        </div>
      </div>

      {/* Секция игр */}
      <div className="m-section-label">🎮 Games</div>

      <div className="m-games">
        {/* Карточка TOWER */}
        <button className="m-card" onClick={() => setInGame(true)}>
          {/* Фон карточки */}
          <div className="m-card-bg" />
          <div className="m-card-shine" />

          {/* Бейджи */}
          <div className="m-card-badges">
            <span className="m-badge m-badge--hot">🔥 HOT</span>
            <span className="m-badge m-badge--new">×12 MAX</span>
          </div>

          {/* Персонаж — домик 3D */}
          <div className="m-card-character">
            <div className="m-char-house">
              <div className="m-char-roof" />
              <div className="m-char-wall">
                <div className="m-char-window" />
                <div className="m-char-window" />
                <div className="m-char-door" />
              </div>
              {/* Монеты вокруг */}
              <div className="m-char-coin m-char-coin--1">💰</div>
              <div className="m-char-coin m-char-coin--2">💰</div>
            </div>
          </div>

          {/* Текст */}
          <div className="m-card-body">
            <div className="m-card-title">TOWER</div>
            <div className="m-card-desc">Build & Earn</div>
          </div>

          {/* Кнопка Play */}
          <div className="m-card-play">
            <span>▶</span>
          </div>
        </button>
      </div>

      {/* Нижний баннер */}
      <div className="m-footer-banner">
        <span>🎁 Первые 100 ₽ — бесплатно новым игрокам</span>
      </div>
    </div>
  );
}
