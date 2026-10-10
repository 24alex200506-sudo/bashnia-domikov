import type { CSSProperties } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTowerGame } from './game/useTowerGame';
import { useBalance, getBetMultiplier } from './game/useBalance';
import { Heart, MousePointer2, RotateCcw, Sparkles, Coins, ChevronUp, ChevronDown } from 'lucide-react';

// ─── Домик ──────────────────────────────────────────────────────────────────

function HouseDrawing({ house }: {
  house: {
    x: number; y: number; width: number; height: number;
    angle?: number; bodyColor: string; roofColor: string;
    trimColor: string; windows: number; mini?: boolean;
  };
}) {
  return (
    <div
      className={`house${house.mini ? ' house-mini' : ''}`}
      style={{
        left:   `${((house.x - house.width  / 2) / 440) * 100}%`,
        top:    `${((house.y - house.height / 2) / 720) * 100}%`,
        width:  `${(house.width  / 440) * 100}%`,
        height: `${(house.height / 720) * 100}%`,
        transform: `rotate(${house.angle ?? 0}rad)`,
        '--body': house.bodyColor,
        '--roof': house.roofColor,
        '--trim': house.trimColor,
      } as CSSProperties}
    >
      <div className="house-roof" />
      <div className="house-body" style={{ backgroundColor: house.bodyColor }}>
        {Array.from({ length: house.windows }).map((_, i) => (
          <span key={i} className="house-window"
            style={{ left: `${17 + i * (66 / Math.max(1, house.windows - 1))}%` }} />
        ))}
      </div>
      <div className="house-trim" />
    </div>
  );
}

// ─── Панель ставки ───────────────────────────────────────────────────────────

const BET_STEPS = [10, 25, 50, 100, 200, 500, 1000];

function BetPanel({
  balance, activeBet, betInput, multiplier, rewardPerHouse,
  gameActive, onBet, onCancel, onChangeBetInput,
}: {
  balance: number; activeBet: number; betInput: number;
  multiplier: number; rewardPerHouse: number; gameActive: boolean;
  onBet: (a: number) => void; onCancel: () => void;
  onChangeBetInput: (a: number) => void;
}) {
  const hasBet = activeBet > 0;

  function stepDown() {
    const i = BET_STEPS.indexOf(betInput);
    if (i > 0) onChangeBetInput(BET_STEPS[i - 1]);
    else { const s = BET_STEPS.filter(x => x < betInput); if (s.length) onChangeBetInput(s[s.length - 1]); }
  }
  function stepUp() {
    const i = BET_STEPS.indexOf(betInput);
    if (i !== -1 && i < BET_STEPS.length - 1) onChangeBetInput(BET_STEPS[i + 1]);
    else if (i === -1) { const s = BET_STEPS.filter(x => x > betInput); if (s.length) onChangeBetInput(s[0]); }
  }

  return (
    <div className="bet-panel">
      {/* Строка баланса */}
      <div className="bet-balance-row">
        <span className="bet-balance-label"><Coins size={12}/> БАЛАНС</span>
        <span className="bet-balance-value">{balance.toLocaleString('ru')} ₽</span>
      </div>

      <div className="bet-main">
        <div className="bet-selector">
          <button className="bet-step-btn" onClick={stepDown} disabled={hasBet || gameActive}><ChevronDown size={18}/></button>
          <div className="bet-amount-display">
            <span className="bet-amount-value">{betInput.toLocaleString('ru')}</span>
            <span className="bet-amount-rub">₽</span>
          </div>
          <button className="bet-step-btn" onClick={stepUp} disabled={hasBet || gameActive}><ChevronUp size={18}/></button>
        </div>

        {!hasBet ? (
          <button className="bet-place-btn" onClick={() => onBet(betInput)}
            disabled={betInput > balance || balance === 0}>
            {balance === 0 ? 'Нет баланса' : betInput > balance ? 'Мало' : 'Поставить'}
          </button>
        ) : (
          <button className="bet-cancel-btn" onClick={onCancel} disabled={gameActive}>
            Отменить <span className="bet-cancel-sum">{activeBet.toLocaleString('ru')} ₽</span>
          </button>
        )}
      </div>

      <div className="bet-info-row">
        {hasBet ? (
          <>
            <span className="bet-info-mult">×{multiplier} мульт.</span>
            <span className="bet-info-sep">·</span>
            <span className="bet-info-reward"><Coins size={11}/> +{rewardPerHouse} ₽ / домик</span>
          </>
        ) : (
          <span className="bet-info-hint">
            {balance === 0 ? '👑 Попроси админа пополнить баланс' : 'Ставь больше — получай больше'}
          </span>
        )}
      </div>

      {!hasBet && !gameActive && balance > 0 && (
        <div className="bet-quick-row">
          {BET_STEPS.filter(s => s <= balance).slice(0, 5).map(s => (
            <button key={s} className={`bet-quick-btn${betInput === s ? ' active' : ''}`}
              onClick={() => onChangeBetInput(s)}>
              {s >= 1000 ? `${s/1000}к` : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Масштабирование сцены ───────────────────────────────────────────────────

function useStageScale(W: number, H: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      el.style.setProperty('--stage-scale', String(Math.min(width / W, height / H)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H]);
  return ref;
}

// ─── Главный компонент ───────────────────────────────────────────────────────

export default function App() {
  const {
    balance, activeBet, pendingWin, username, isLoaded,
    placeBet, cancelBet, addToPending, collectWin, endRound,
  } = useBalance();

  const [betInput, setBetInput] = useState(10);

  const handleHousePlaced = useCallback((reward: number) => {
    addToPending(reward);
  }, [addToPending]);

  // 1 жизнь — проиграл сразу, ставка сгорает
  const handleGameOver = useCallback(() => {
    endRound();
  }, [endRound]);

  const { snapshot, startGame, dropHouse, restartGame, stageWidth, stageHeight } =
    useTowerGame(activeBet, handleHousePlaced, handleGameOver);

  const stageRef = useStageScale(stageWidth, stageHeight);

  const isMoving   = snapshot.status === 'moving';
  const isReady    = snapshot.status === 'ready';
  const isOver     = snapshot.status === 'over';
  const gameActive = isMoving || snapshot.status === 'settling';
  const multiplier = getBetMultiplier(activeBet);

  if (!isLoaded) {
    return (
      <div className="tma-loading">
        <div className="tma-loading-dot"/><div className="tma-loading-dot"/><div className="tma-loading-dot"/>
      </div>
    );
  }

  return (
    <div className="tma-shell">

      {/* ── Шапка ── */}
      <header className="tma-header">
        {/* Баланс — только реальные деньги */}
        <div className="header-balance">
          <span className="header-logo">🏠 Nekit Casino</span>
          {username && <span className="header-username">@{username}</span>}
        </div>

        <div className="header-right">
          {/* Банк — визуальный, не реальный баланс */}
          {pendingWin > 0 && !isOver && (
            <button className="header-bank-btn" onClick={collectWin} disabled={gameActive}
              title={gameActive ? 'Закончи раунд' : 'Забрать выигрыш'}>
              <span className="header-bank-amount">+{pendingWin.toLocaleString('ru')} ₽</span>
              {!gameActive && <span className="header-bank-collect">ЗАБРАТЬ</span>}
            </button>
          )}

          {/* 1 жизнь */}
          <Heart className={`tma-heart${snapshot.lives <= 0 ? ' lost' : ''}`} size={16} fill="currentColor"/>

          {!isReady && !isOver && (
            <button className="tma-restart-btn" onClick={restartGame} aria-label="Заново">
              <RotateCcw size={13}/>
            </button>
          )}
        </div>
      </header>

      {/* ── Игровое поле ── */}
      <div ref={stageRef} className="tma-stage-wrap"
        role="button" tabIndex={0}
        onClick={() => { if (isMoving) dropHouse(); }}>
        <div className="stage-art">
          <div className="stage-scaler">
            <div className="sky"/>
            <div className="stage-world"
              style={{ transform: `translate3d(0,${snapshot.cameraOffset}px,0)` }}>
              <span className="cloud cloud-one"/><span className="cloud cloud-two"/><span className="cloud cloud-three"/>
              <span className="hill hill-left"/><span className="hill hill-right"/>
              <div className="ground"/>
              <div className="stage-houses">
                {snapshot.houses.map(h => <HouseDrawing key={h.id} house={h}/>)}
                {snapshot.activeHouse && <HouseDrawing house={snapshot.activeHouse}/>}
              </div>
            </div>

            <div className="live-pill">
              <span className="live-dot"/>
              {isMoving ? 'Ваш ход' : isReady ? 'Готов' : isOver ? 'Раунд завершён' : 'Приземляется...'}
            </div>

            {/* ── Экран СТАРТА ── */}
            {isReady && (
              <div className="tma-overlay">
                <p className="tma-overlay-kicker">Башня домиков</p>
                <h2 className="tma-overlay-title">Построим башню?</h2>
                <p className="tma-overlay-sub">
                  {activeBet > 0
                    ? `Ставка ${activeBet} ₽ · ×${multiplier} за домик`
                    : balance === 0
                    ? '👑 Попроси админа пополнить баланс'
                    : 'Сделай ставку снизу · 1 попытка'}
                </p>
                <button className="tma-play-btn" onClick={e => { e.stopPropagation(); startGame(); }}>
                  <Sparkles size={16}/> Начать
                </button>
              </div>
            )}

            {/* ── Экран КОНЦА ── */}
            {isOver && (
              <div className="tma-overlay">
                <p className="tma-overlay-kicker">💀 Башня упала</p>
                <h2 className="tma-overlay-title">
                  {snapshot.placedCount} домик{snapshot.placedCount === 1 ? '' : snapshot.placedCount < 5 ? 'а' : 'ов'}
                </h2>

                {pendingWin > 0 ? (
                  <>
                    <div className="gameover-bank">
                      <div className="gameover-bank-label">Твой банк</div>
                      <div className="gameover-bank-amount">{pendingWin.toLocaleString('ru')} ₽</div>
                      <div className="gameover-bank-note">Ещё не на балансе</div>
                    </div>
                    <button className="bank-collect-btn-big"
                      onClick={e => { e.stopPropagation(); collectWin(); }}>
                      💰 Забрать на баланс
                    </button>
                    <button className="tma-play-btn secondary"
                      onClick={e => { e.stopPropagation(); restartGame(); }}>
                      <RotateCcw size={14}/> Играть снова
                    </button>
                  </>
                ) : (
                  <>
                    <p className="tma-overlay-sub">Ставка {activeBet > 0 ? activeBet : ''} ₽ сгорела</p>
                    <button className="tma-play-btn" onClick={e => { e.stopPropagation(); restartGame(); }}>
                      <RotateCcw size={15}/> Играть снова
                    </button>
                  </>
                )}
              </div>
            )}

            {isMoving && (
              <button className="tma-drop-btn" onClick={e => { e.stopPropagation(); dropHouse(); }}>
                <MousePointer2 size={14}/> Поставить
              </button>
            )}

            {snapshot.lastAward !== null && isMoving && (
              <div className="award-pop" key={`${snapshot.placedCount}-${snapshot.lastAward}`}>
                +{snapshot.lastAward} ₽
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Панель ставки ── */}
      <BetPanel
        balance={balance} activeBet={activeBet} betInput={betInput}
        multiplier={multiplier} rewardPerHouse={snapshot.rewardPerHouse}
        gameActive={gameActive} onBet={placeBet} onCancel={cancelBet}
        onChangeBetInput={setBetInput}
      />

    </div>
  );
}
