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
          <span className="m-logo-icon">🎰</span>
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

          {/* Превью — 3D башня */}
          <div className="m-card-preview">
            <div className="m-prev-sky" />
            <div className="m-prev-sun" />
            <div className="m-prev-cloud m-prev-cloud--1" />
            <div className="m-prev-cloud m-prev-cloud--2" />
            {/* Башня */}
            <div className="m-prev-tower">
              <div className="m-prev-house" style={{ width: 48, background: '#ef8bb4', '--r': '#c95f8d' } as React.CSSProperties} />
              <div className="m-prev-house" style={{ width: 58, background: '#6bc8be', '--r': '#338f91' } as React.CSSProperties} />
              <div className="m-prev-house" style={{ width: 68, background: '#f5c66e', '--r': '#e18d49' } as React.CSSProperties} />
              <div className="m-prev-house" style={{ width: 78, background: '#9b8de4', '--r': '#6959b8' } as React.CSSProperties} />
            </div>
            {/* Домик на цепи */}
            <div className="m-prev-crane">
              <div className="m-prev-chain" />
              <div className="m-prev-falling-house" style={{ background: '#83c879', '--r': '#4f9d6f' } as React.CSSProperties} />
            </div>
          </div>

          {/* Текст */}
          <div className="m-card-body">
            <div className="m-card-title">TOWER</div>
            <div className="m-card-desc">Build & Earn</div>
            <div className="m-card-stats">
              <span className="m-stat">⚡ Fast</span>
              <span className="m-stat">💎 ×12</span>
              <span className="m-stat">🏆 Top</span>
            </div>
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
