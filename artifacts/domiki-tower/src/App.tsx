import type { CSSProperties } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTowerGame } from './game/useTowerGame';
import { useBalance, getBetMultiplier } from './game/useBalance';
import { Heart, MousePointer2, RotateCcw, Sparkles, Coins, ChevronUp, ChevronDown } from 'lucide-react';

// ─── Домик (рендер) ────────────────────────────────────────────────────────

function HouseDrawing({
  house,
}: {
  house: {
    x: number; y: number; width: number; height: number;
    angle?: number; bodyColor: string; roofColor: string;
    trimColor: string; windows: number; mini?: boolean;
  };
}) {
  const left = `${((house.x - house.width / 2) / 440) * 100}%`;
  const top  = `${((house.y - house.height / 2) / 720) * 100}%`;
  return (
    <div
      className={`house${house.mini ? ' house-mini' : ''}`}
      style={{
        left, top,
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
          <span
            key={i}
            className="house-window"
            style={{ left: `${17 + i * (66 / Math.max(1, house.windows - 1))}%` }}
          />
        ))}
      </div>
      <div className="house-trim" />
    </div>
  );
}

// ─── Панель ставки ──────────────────────────────────────────────────────────

const BET_STEPS = [10, 25, 50, 100, 200, 500, 1000];

function BetPanel({
  balance,
  activeBet,
  betInput,
  multiplier,
  rewardPerHouse,
  gameActive,
  onBet,
  onCancel,
  onChangeBetInput,
}: {
  balance: number;
  activeBet: number;
  betInput: number;
  multiplier: number;
  rewardPerHouse: number;
  gameActive: boolean;
  onBet: (amount: number) => void;
  onCancel: () => void;
  onChangeBetInput: (amount: number) => void;
}) {
  const hasBet = activeBet > 0;

  function stepDown() {
    const currentIdx = BET_STEPS.indexOf(betInput);
    if (currentIdx > 0) onChangeBetInput(BET_STEPS[currentIdx - 1]);
    else {
      // betInput не в массиве — находим ближайший меньший
      const smaller = BET_STEPS.filter(s => s < betInput);
      if (smaller.length) onChangeBetInput(smaller[smaller.length - 1]);
    }
  }

  function stepUp() {
    const currentIdx = BET_STEPS.indexOf(betInput);
    if (currentIdx !== -1 && currentIdx < BET_STEPS.length - 1) {
      onChangeBetInput(BET_STEPS[currentIdx + 1]);
    } else if (currentIdx === -1) {
      // betInput не в массиве — находим ближайший больший
      const larger = BET_STEPS.filter(s => s > betInput);
      if (larger.length) onChangeBetInput(larger[0]);
    }
  }

  return (
    <div className="bet-panel">
      {/* Баланс */}
      <div className="bet-balance-row">
        <div className="bet-balance-label"><Coins size={13} /> Баланс</div>
        <div className="bet-balance-value">{balance.toLocaleString('ru')} ₽</div>
      </div>

      {/* Основной блок */}
      <div className="bet-main">
        <div className="bet-selector">
          <button
            className="bet-step-btn"
            onClick={stepDown}
            disabled={hasBet || gameActive}
            aria-label="Уменьшить ставку"
          >
            <ChevronDown size={18} />
          </button>
          <div className="bet-amount-display">
            <span className="bet-amount-value">{betInput.toLocaleString('ru')}</span>
            <span className="bet-amount-rub">₽</span>
          </div>
          <button
            className="bet-step-btn"
            onClick={stepUp}
            disabled={hasBet || gameActive}
            aria-label="Увеличить ставку"
          >
            <ChevronUp size={18} />
          </button>
        </div>

        {!hasBet ? (
          <button
            className="bet-place-btn"
            onClick={() => onBet(betInput)}
            disabled={betInput > balance || balance === 0}
          >
            {balance === 0 ? 'Нет баланса' : betInput > balance ? 'Мало' : 'Поставить'}
          </button>
        ) : (
          <button
            className="bet-cancel-btn"
            onClick={onCancel}
            disabled={gameActive}
          >
            Отменить <span className="bet-cancel-sum">{activeBet.toLocaleString('ru')} ₽</span>
          </button>
        )}
      </div>

      {/* Инфо о множителе */}
      <div className="bet-info-row">
        {hasBet ? (
          <>
            <span className="bet-info-mult">×{multiplier} мульт.</span>
            <span className="bet-info-sep">·</span>
            <span className="bet-info-reward"><Coins size={11} /> +{rewardPerHouse} ₽ / домик</span>
          </>
        ) : (
          <>
            <span className="bet-info-hint">Больше ставка → больше за домик</span>
            {balance === 0 && <span className="bet-info-add">Пополни у админа</span>}
          </>
        )}
      </div>

      {/* Быстрые кнопки */}
      {!hasBet && !gameActive && balance > 0 && (
        <div className="bet-quick-row">
          {BET_STEPS.filter(s => s <= balance).slice(0, 5).map(s => (
            <button
              key={s}
              className={`bet-quick-btn${betInput === s ? ' active' : ''}`}
              onClick={() => onChangeBetInput(s)}
            >
              {s >= 1000 ? `${s / 1000}к` : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Хук масштабирования сцены ─────────────────────────────────────────────
// Сцена в игре — 440×720 пикселей (виртуальные).
// Реальный контейнер может быть любого размера.
// Вычисляем scale = min(containerW/440, containerH/720) и
// передаём через CSS-переменную.
function useStageScale(VIRT_W: number, VIRT_H: number) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(width / VIRT_W, height / VIRT_H);
      el.style.setProperty('--stage-scale', String(scale));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [VIRT_W, VIRT_H]);

  return wrapRef;
}

// ─── Главный компонент ──────────────────────────────────────────────────────

function App() {
  const {
    balance, activeBet, username, isLoaded,
    placeBet, cancelBet, addWinnings, endRound,
  } = useBalance();

  const [betInput, setBetInput] = useState(10);

  const handleHousePlaced = useCallback((reward: number) => {
    addWinnings(reward);
  }, [addWinnings]);

  const handleGameOver = useCallback((won: boolean) => {
    endRound(won);
  }, [endRound]);

  const { snapshot, startGame, dropHouse, restartGame, stageWidth, stageHeight } =
    useTowerGame(activeBet, handleHousePlaced, handleGameOver);

  const stageWrapRef = useStageScale(stageWidth, stageHeight);

  const isMoving   = snapshot.status === 'moving';
  const isReady    = snapshot.status === 'ready';
  const isOver     = snapshot.status === 'over';
  const gameActive = isMoving || snapshot.status === 'settling';
  const multiplier = getBetMultiplier(activeBet);

  const handleStagePress = () => { if (isMoving) dropHouse(); };

  if (!isLoaded) {
    return (
      <div className="tma-loading">
        <div className="tma-loading-dot" />
        <div className="tma-loading-dot" />
        <div className="tma-loading-dot" />
      </div>
    );
  }

  return (
    <div className="tma-shell">

      {/* ── Header ── */}
      <header className="tma-header">
        <div className="tma-header-left">
          <span className="tma-title">🏠 Башня</span>
          {username && <span className="tma-username">@{username}</span>}
        </div>
        <div className="tma-header-right">
          <div className="tma-session-earn">
            <Coins size={12} />
            <span>+{snapshot.sessionEarnings} ₽</span>
          </div>
          <div className="tma-lives">
            {[0, 1, 2].map(i => (
              <Heart
                key={i}
                className={`tma-heart${i >= snapshot.lives ? ' lost' : ''}`}
                size={14}
                fill="currentColor"
              />
            ))}
          </div>
          {!isReady && !isOver && (
            <button className="tma-restart-btn" onClick={restartGame} aria-label="Заново">
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </header>

      {/* ── Stage ── */}
      <div
        ref={stageWrapRef}
        className="tma-stage-wrap"
        role="button"
        tabIndex={0}
        aria-label={isMoving ? 'Нажмите чтобы поставить домик' : 'Игровое поле'}
        onClick={handleStagePress}
      >
        {/* stage-art — абсолютный, занимает весь wrap */}
        <div className="stage-art">

          {/* stage-scaler — виртуальный 440×720, масштабирован через CSS var */}
          <div className="stage-scaler">

            {/* sky + world фиксированы, camera двигает stage-world */}
            <div className="sky" />

            <div
              className="stage-world"
              style={{ transform: `translate3d(0, ${snapshot.cameraOffset}px, 0)` }}
            >
              <span className="cloud cloud-one" />
              <span className="cloud cloud-two" />
              <span className="cloud cloud-three" />
              <span className="hill hill-left" />
              <span className="hill hill-right" />
              <div className="ground" />
              <div className="stage-houses">
                {snapshot.houses.map(h => <HouseDrawing key={h.id} house={h} />)}
                {snapshot.activeHouse && <HouseDrawing house={snapshot.activeHouse} />}
              </div>
            </div>

            {/* UI поверх — внутри scaler, чтобы масштабировались вместе */}
            <div className="live-pill">
              <span className="live-dot" />
              {isMoving ? 'Ваш ход' : isReady ? 'Готов' : isOver ? 'Раунд завершён' : 'Приземляется...'}
            </div>

            {isReady && (
              <div className="tma-overlay">
                <p className="tma-overlay-kicker">Добро пожаловать</p>
                <h2 className="tma-overlay-title">Построим башню?</h2>
                <p className="tma-overlay-sub">
                  {activeBet > 0
                    ? `Ставка ${activeBet} ₽ · ×${multiplier} за домик`
                    : 'Сделай ставку снизу, чтобы зарабатывать'}
                </p>
                <button className="tma-play-btn" onClick={e => { e.stopPropagation(); startGame(); }}>
                  <Sparkles size={16} /> Начать
                </button>
              </div>
            )}

            {isOver && (
              <div className="tma-overlay">
                <p className="tma-overlay-kicker">Башня упала</p>
                <h2 className="tma-overlay-title">
                  {snapshot.placedCount} домик
                  {snapshot.placedCount === 1 ? '' : snapshot.placedCount < 5 ? 'а' : 'ов'}
                </h2>
                <p className="tma-overlay-sub">+{snapshot.sessionEarnings} ₽ за раунд</p>
                <button className="tma-play-btn" onClick={e => { e.stopPropagation(); restartGame(); }}>
                  <RotateCcw size={15} /> Играть снова
                </button>
              </div>
            )}

            {isMoving && (
              <button className="tma-drop-btn" onClick={e => { e.stopPropagation(); dropHouse(); }}>
                <MousePointer2 size={14} /> Поставить
              </button>
            )}

            {snapshot.lastAward !== null && isMoving && (
              <div className="award-pop" key={`${snapshot.placedCount}-${snapshot.lastAward}`}>
                +{snapshot.lastAward} ₽
              </div>
            )}

          </div>{/* /stage-scaler */}
        </div>{/* /stage-art */}
      </div>

      {/* ── Bet Panel ── */}
      <BetPanel
        balance={balance}
        activeBet={activeBet}
        betInput={betInput}
        multiplier={multiplier}
        rewardPerHouse={snapshot.rewardPerHouse}
        gameActive={gameActive}
        onBet={placeBet}
        onCancel={cancelBet}
        onChangeBetInput={setBetInput}
      />

    </div>
  );
}

export default App;
