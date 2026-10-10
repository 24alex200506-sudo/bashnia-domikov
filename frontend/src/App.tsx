import type { CSSProperties } from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTowerGame } from './game/useTowerGame';
import { useBalance, getBetMultiplier } from './game/useBalance';
import { MousePointer2, RotateCcw, Sparkles, Coins, ChevronUp, ChevronDown, X } from 'lucide-react';

// ─ Домик на цепи (движется как пендульм, не просто едет) ─────────────────────────
function ActiveHouseOnCrane({ house, chainLen }: { house: { x:number;y:number;width:number;height:number;bodyColor:string;roofColor:string; }; chainLen: number; }) {
  const pct = house.x / 440;
  const left = `${pct * 100}%`;
  // Crane position - percentage across stage
  return (
    <div className="crane-wrapper" style={{ top: 0, left: 0, right: 0, position:'absolute', display:'flex', justifyContent:'center', pointerEvents:'none' }}>
      <div className="crane-chain-container" style={{ position:'absolute', left, transform:'translateX(-50%)' }}>
        <div className="crane-hook"/>
        <div className="crane-chain" style={{ height: chainLen + 'px' }}/>
        <div className="house-on-crane">
          <div className="house-on-crane-inner" style={{ width: house.width * 0.85 + 'px', height: house.height * 0.85 + 'px', backgroundColor: house.bodyColor }}>
            <div style={{ position:'absolute', top:'-18px', left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft: (house.width*0.425+8)+'px solid transparent', borderRight: (house.width*0.425+8)+'px solid transparent', borderBottom: '22px solid ' + house.roofColor }}/>
            <div className="hoc-window" style={{ width:'22%', height:'30%', top:'20%', left:'12%' }}/>
            <div className="hoc-window" style={{ width:'22%', height:'30%', top:'20%', right:'12%' }}/>
            <div className="hoc-door" style={{ width:'24%', height:'38%' }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─ Поставленный домик ─────────────────────────────────────────────────────────────
function HouseDrawing({ house }: { house: { x:number;y:number;width:number;height:number;angle?:number;bodyColor:string;roofColor:string;trimColor:string;windows:number;mini?:boolean; }; }) {
  return (
    <div className={`house${house.mini?' house-mini':''}`} style={{ left:`${((house.x-house.width/2)/440)*100}%`, top:`${((house.y-house.height/2)/720)*100}%`, width:`${(house.width/440)*100}%`, height:`${(house.height/720)*100}%`, transform:`rotate(${house.angle??0}rad)`, '--body':house.bodyColor,'--roof':house.roofColor,'--trim':house.trimColor } as CSSProperties}>
      <div className="house-roof"/>
      <div className="house-body" style={{ backgroundColor:house.bodyColor }}>
        {Array.from({length:house.windows}).map((_,i)=>(<span key={i} className="house-window" style={{left:`${17+i*(66/Math.max(1,house.windows-1))}%`}}/>))}
      </div>
      <div className="house-trim"/>
    </div>
  );
}

// ─ Модальное окно ставки ────────────────────────────────────────────────
const BET_STEPS = [10, 25, 50, 100, 200, 500, 1000];
function BetModal({ balance, betInput, onBet, onClose, onChangeBetInput }: { balance:number;betInput:number;onBet:(a:number)=>void;onClose:()=>void;onChangeBetInput:(a:number)=>void; }) {
  const mult = getBetMultiplier(betInput);
  const reward = Math.round(10*mult);
  function stepDown(){const i=BET_STEPS.indexOf(betInput);if(i>0)onChangeBetInput(BET_STEPS[i-1]);else{const s=BET_STEPS.filter(x=>x<betInput);if(s.length)onChangeBetInput(s[s.length-1]);}}
  function stepUp(){const i=BET_STEPS.indexOf(betInput);if(i!==-1&&i<BET_STEPS.length-1)onChangeBetInput(BET_STEPS[i+1]);else if(i===-1){const s=BET_STEPS.filter(x=>x>betInput);if(s.length)onChangeBetInput(s[0]);}}
  const canBet = betInput<=balance&&balance>0;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <h3 className="modal-title">Сделать ставку</h3>
        <div className="modal-row"><span className="modal-label">Ваш баланс</span><span className="modal-value green">{balance.toLocaleString('ru')} ₽</span></div>
        <div className="modal-bet-selector">
          <button className="modal-step-btn" onClick={stepDown}><ChevronDown size={22}/></button>
          <div className="modal-bet-amount">{betInput.toLocaleString('ru')} <span>₽</span></div>
          <button className="modal-step-btn" onClick={stepUp}><ChevronUp size={22}/></button>
        </div>
        <div className="modal-row"><span className="modal-label">Ваша ставка</span><span className="modal-value">{betInput.toLocaleString('ru')} ₽</span></div>
        <div className="modal-row"><span className="modal-label">Множитель</span><span className="modal-value gold">×{mult}</span></div>
        <div className="modal-row"><span className="modal-label">За каждый домик</span><span className="modal-value gold">+{reward} ₽</span></div>
        <div className="modal-quick-row">{BET_STEPS.filter(s=>s<=balance).slice(0,5).map(s=>(<button key={s} className={`modal-quick-btn${betInput===s?' active':''}`} onClick={()=>onChangeBetInput(s)}>{s>=1000?`${s/1000}к`:s}</button>))}</div>
        <button className="modal-place-btn" onClick={()=>{onBet(betInput);onClose();}} disabled={!canBet}>{canBet?`Поставить ${betInput.toLocaleString('ru')} ₽`:'Недостаточно средств'}</button>
      </div>
    </div>
  );
}

function useStageScale(W:number,H:number){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{const el=ref.current;if(!el)return;const update=()=>{const{width,height}=el.getBoundingClientRect();if(!width||!height)return;el.style.setProperty('--stage-scale',String(Math.min(width/W,height/H)));};update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect();},[W,H]);return ref;}

export default function App() {
  const{balance,activeBet,pendingWin,username,isLoaded,placeBet,cancelBet,addToPending,collectWin,endRound}=useBalance();
  const[betInput,setBetInput]=useState(10);
  const[showModal,setShowModal]=useState(false);
  const handleHousePlaced=useCallback((r:number)=>addToPending(r),[addToPending]);
  const handleGameOver=useCallback(()=>endRound(),[endRound]);
  const{snapshot,startGame,dropHouse,restartGame,stageWidth,stageHeight}=useTowerGame(activeBet,handleHousePlaced,handleGameOver);
  const stageRef=useStageScale(stageWidth,stageHeight);
  const isMoving=snapshot.status==='moving',isReady=snapshot.status==='ready',isOver=snapshot.status==='over';
  const gameActive=isMoving||snapshot.status==='settling';
  const multiplier=getBetMultiplier(activeBet);

  // Клик по полю — только если есть ставка
  const handleStageTap=useCallback(()=>{if(!isMoving||activeBet<=0)return;dropHouse();},[isMoving,activeBet,dropHouse]);
  const handleStart=useCallback((e:React.MouseEvent)=>{e.stopPropagation();startGame();},[startGame]);

  // Длина цепи — зависит от высоты башни
  const chainLen = Math.max(60, Math.min(200, 60 + snapshot.placedCount * 8));

  if(!isLoaded)return(<div className="tma-loading"><div className="tma-loading-dot"/><div className="tma-loading-dot"/><div className="tma-loading-dot"/></div>);
  return(
    <div className="tma-shell">
      <header className="tma-header">
        <div className="header-left">{username&&<span className="header-username">@{username}</span>}</div>
        <span className="header-logo">Nekit Casino</span>
        <div className="header-right">
          {pendingWin>0&&!isOver&&(<button className="header-bank-btn" onClick={collectWin} disabled={gameActive}><span className="header-bank-amount">+{pendingWin.toLocaleString('ru')} ₽</span>{!gameActive&&<span className="header-bank-collect">ЗАБРАТЬ</span>}</button>)}
        </div>
      </header>

      <div ref={stageRef} className="tma-stage-wrap" role="button" tabIndex={0} onClick={handleStageTap}>
        <div className="stage-art"><div className="stage-scaler">
          {/* Фон */}
          <div className="sky"/>
          <div className="sun"/>
          <span className="cloud cloud-one"/><span className="cloud cloud-two"/><span className="cloud cloud-three"/>

          {/* Шар Nekit Casino */}
          <div className="balloon">
            <div className="balloon-body"><div className="balloon-text">Nekit<br/>Casino</div></div>
            <div className="balloon-rope"/>
            <div className="balloon-basket"/>
          </div>

          {/* Город на фоне */}
          <div className="city-bg">
            <div className="city-bld" style={{width:'15%',height:'70%'}}/>
            <div className="city-bld" style={{width:'12%',height:'45%'}}/>
            <div className="city-bld" style={{width:'18%',height:'85%'}}/>
            <div className="city-bld" style={{width:'10%',height:'35%'}}/>
            <div style={{flex:1}}/>
            <div className="city-bld" style={{width:'12%',height:'50%'}}/>
            <div className="city-bld" style={{width:'16%',height:'75%'}}/>
            <div className="city-bld" style={{width:'10%',height:'40%'}}/>
          </div>

          {/* Здание Nekit Casino */}
          <div className="casino-building">
            <div className="casino-roof"><div className="casino-roof-text">NEKIT CASINO</div></div>
            <div className="casino-body">
              <div className="casino-window"/>
              <div className="casino-door"/>
              <div className="casino-window"/>
            </div>
          </div>

          {/* Дорога */}
          <div className="ground-road"/>

          {/* Домики */}
          <div className="stage-world" style={{transform:`translate3d(0,${snapshot.cameraOffset}px,0)`}}>
            <div className="stage-houses">
              {snapshot.houses.map(h=><HouseDrawing key={h.id} house={h}/>)}
            </div>
          </div>

          {/* Активный домик на цепи */}
          {snapshot.activeHouse&&(
            <ActiveHouseOnCrane house={snapshot.activeHouse} chainLen={chainLen}/>
          )}

          <div className="live-pill"><span className="live-dot"/>{isMoving?'Ваш ход':isReady?'Готов':isOver?'Раунд завершён':'Приземляется...'}</div>

          {isReady&&(<div className="tma-overlay">
            <p className="tma-overlay-kicker">Добро пожаловать</p>
            <h2 className="tma-overlay-title">Nekit Casino</h2>
            <p className="tma-overlay-sub">Добро пожаловать!</p>
            <button className="tma-play-btn" onClick={e=>{e.stopPropagation();startGame();}}><Sparkles size={16}/>ЗАЙТИ</button>
          </div>)}

          {isOver&&(<div className="tma-overlay">
            <p className="tma-overlay-kicker">💀 Башня упала</p>
            <h2 className="tma-overlay-title">{snapshot.placedCount} домик{snapshot.placedCount===1?'':snapshot.placedCount<5?'а':'ов'}</h2>
            {pendingWin>0?(<>
              <div className="gameover-bank"><div className="gameover-bank-label">Твой банк</div><div className="gameover-bank-amount">{pendingWin.toLocaleString('ru')} ₽</div><div className="gameover-bank-note">Ещё не на балансе!</div></div>
              <button className="bank-collect-btn-big" onClick={e=>{e.stopPropagation();collectWin();}}>💰 Забрать на баланс</button>
              <button className="tma-play-btn secondary" onClick={e=>{e.stopPropagation();restartGame();}}><RotateCcw size={14}/> Играть снова</button>
            </>):(<>
              <p className="tma-overlay-sub">Ставка сгорела 🔥</p>
              <button className="tma-play-btn" onClick={e=>{e.stopPropagation();restartGame();}}><RotateCcw size={15}/> Играть снова</button>
            </>)}
          </div>)}

          {isMoving&&activeBet>0&&(<button className="tma-drop-btn" onClick={e=>{e.stopPropagation();dropHouse();}}>СТРОЙ</button>)}
          {snapshot.lastAward!==null&&isMoving&&(<div className="award-pop" key={`${snapshot.placedCount}-${snapshot.lastAward}`}>+{snapshot.lastAward} ₽</div>)}
        </div></div>
      </div>

      {/* Нижняя панель */}
      <div className="bottom-bar">
        {activeBet>0?(
          <div className="bottom-active-bet">
            <div className="bottom-bet-left">
              <span className="bottom-bet-label">Ставка</span>
              <div className="bottom-bet-row">
                <span className="bottom-bet-val">{activeBet.toLocaleString('ru')} ₽</span>
                <span className="bottom-bet-mult">×{multiplier}</span>
                <span className="bottom-bet-reward">+{snapshot.rewardPerHouse} ₽/дом</span>
              </div>
            </div>
            <button className="bottom-cancel-btn" onClick={cancelBet} disabled={gameActive}>Отменить</button>
          </div>
        ):(
          <button className="bottom-place-btn" onClick={()=>setShowModal(true)} disabled={balance===0}>
            <Coins size={18}/>{balance===0?'👑 Попроси админа пополнить':'СДЕЛАТЬ СТАВКУ'}
          </button>
        )}
      </div>

      {showModal&&<BetModal balance={balance} betInput={betInput} onBet={placeBet} onClose={()=>setShowModal(false)} onChangeBetInput={setBetInput}/>}
    </div>
  );
}