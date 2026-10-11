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
              {/* 3D домик через SVG */}
              <svg width="90" height="96" viewBox="0 0 90 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Тень */}
                <ellipse cx="45" cy="93" rx="32" ry="5" fill="rgba(0,0,0,0.35)"/>
                {/* Стены */}
                <rect x="8" y="46" width="60" height="46" rx="4" fill="url(#wallGrad)"/>
                {/* Боковая грань 3D */}
                <path d="M68 46 L82 36 L82 82 L68 92 Z" fill="url(#sideGrad)"/>
                {/* Крыша фронт */}
                <path d="M4 48 L38 16 L72 48 Z" fill="url(#roofGrad)"/>
                {/* Крыша бок 3D */}
                <path d="M72 48 L86 38 L56 8 L38 16 Z" fill="url(#roofSideGrad)"/>
                {/* Блик на крыше */}
                <path d="M38 16 L55 30 L44 40" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"/>
                {/* Окно левое */}
                <rect x="14" y="56" width="18" height="16" rx="3" fill="url(#winGrad)"/>
                <line x1="23" y1="56" x2="23" y2="72" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                <line x1="14" y1="64" x2="32" y2="64" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                {/* Окно правое */}
                <rect x="38" y="56" width="18" height="16" rx="3" fill="url(#winGrad)"/>
                <line x1="47" y1="56" x2="47" y2="72" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                <line x1="38" y1="64" x2="56" y2="64" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
                {/* Дверь */}
                <rect x="26" y="70" width="16" height="22" rx="3" fill="url(#doorGrad)"/>
                <circle cx="39" cy="81" r="1.5" fill="rgba(255,255,255,0.6)"/>
                {/* Блик на стенах */}
                <rect x="8" y="46" width="12" height="46" rx="4" fill="rgba(255,255,255,0.08)"/>
                <defs>
                  <linearGradient id="wallGrad" x1="8" y1="46" x2="68" y2="92" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFD54F"/>
                    <stop offset="100%" stopColor="#F9A825"/>
                  </linearGradient>
                  <linearGradient id="sideGrad" x1="68" y1="46" x2="82" y2="92" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E65100"/>
                    <stop offset="100%" stopColor="#BF360C"/>
                  </linearGradient>
                  <linearGradient id="roofGrad" x1="4" y1="48" x2="72" y2="16" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#E53935"/>
                    <stop offset="100%" stopColor="#FF7043"/>
                  </linearGradient>
                  <linearGradient id="roofSideGrad" x1="72" y1="48" x2="86" y2="8" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#B71C1C"/>
                    <stop offset="100%" stopColor="#D32F2F"/>
                  </linearGradient>
                  <linearGradient id="winGrad" x1="14" y1="56" x2="32" y2="72" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#81D4FA"/>
                    <stop offset="100%" stopColor="#29B6F6"/>
                  </linearGradient>
                  <linearGradient id="doorGrad" x1="26" y1="70" x2="42" y2="92" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#8D6E63"/>
                    <stop offset="100%" stopColor="#5D4037"/>
                  </linearGradient>
                </defs>
              </svg>
              {/* Монеты SVG */}
              <div className="m-char-coin m-char-coin--1">
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="13" fill="url(#cg1)" stroke="#B8860B" strokeWidth="1.5"/>
                  <circle cx="14" cy="14" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                  <text x="14" y="19" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#7A4F00">₽</text>
                  <defs><radialGradient id="cg1" cx="35%" cy="30%"><stop offset="0%" stopColor="#FFE566"/><stop offset="100%" stopColor="#D4A017"/></radialGradient></defs>
                </svg>
              </div>
              <div className="m-char-coin m-char-coin--2">
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <circle cx="11" cy="11" r="10" fill="url(#cg2)" stroke="#B8860B" strokeWidth="1.2"/>
                  <text x="11" y="15.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#7A4F00">₽</text>
                  <defs><radialGradient id="cg2" cx="35%" cy="30%"><stop offset="0%" stopColor="#FFE566"/><stop offset="100%" stopColor="#D4A017"/></radialGradient></defs>
                </svg>
              </div>
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

      {/* Нижний баннер убран */}
    </div>
  );
}
