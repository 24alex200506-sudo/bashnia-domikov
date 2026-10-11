import { useState } from 'react';
import App from './App';

export default function Menu() {
  const [inGame, setInGame] = useState(false);

  if (inGame) return <App />;

  return (
    <div className="menu-shell">
      {/* Header */}
      <div className="menu-header">
        <span className="menu-logo">🎰 Nekit Casino</span>
        <span className="menu-tag">DEMO</span>
      </div>

      {/* Game card */}
      <div className="menu-content">
        <button className="game-card" onClick={() => setInGame(true)}>
          {/* Badge */}
          <span className="card-badge">🔥 HOT</span>

          {/* Preview — мини башня из домиков */}
          <div className="card-preview">
            {/* Небо */}
            <div className="card-sky" />
            {/* Солнце */}
            <div className="card-sun" />
            {/* Облако */}
            <div className="card-cloud" />
            {/* Башня домиков */}
            <div className="card-tower">
              <div className="card-house" style={{ background: '#ef8bb4', width: 54, '--roof': '#c95f8d' } as React.CSSProperties} />
              <div className="card-house" style={{ background: '#6bc8be', width: 62, '--roof': '#338f91' } as React.CSSProperties} />
              <div className="card-house" style={{ background: '#f5c66e', width: 70, '--roof': '#e18d49' } as React.CSSProperties} />
              <div className="card-house card-house--base" style={{ background: '#68a9dd', width: 80, '--roof': '#3978b8' } as React.CSSProperties} />
            </div>
            {/* Мультипликаторы */}
            <span className="card-mult card-mult--1">×2.5</span>
            <span className="card-mult card-mult--2">×5.0</span>
            <span className="card-mult card-mult--3">×12</span>
          </div>

          {/* Info */}
          <div className="card-info">
            <span className="card-title">TOWER</span>
            <span className="card-sub">Build & Earn</span>
          </div>

          {/* Arrow */}
          <div className="card-arrow">▶</div>
        </button>
      </div>
    </div>
  );
}
