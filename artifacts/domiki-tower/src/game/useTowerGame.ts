import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bodies,
  Body,
  Engine,
  Query,
  Sleeping,
  World,
} from 'matter-js';
import { getBetMultiplier } from './useBalance';

const WIDTH = 440;
const HEIGHT = 720;
const GROUND_Y = 696;
const CAMERA_ANCHOR_Y = 422;
const BASE_REWARD_PER_HOUSE = 10;
const STARTING_LIVES = 3;

const HOUSE_COLORS = [
  { body: '#ef8bb4', roof: '#c95f8d', trim: '#fff3db' },
  { body: '#6bc8be', roof: '#338f91', trim: '#f8f0d7' },
  { body: '#f5c66e', roof: '#e18d49', trim: '#fff4df' },
  { body: '#9b8de4', roof: '#6959b8', trim: '#fff4df' },
  { body: '#83c879', roof: '#4f9d6f', trim: '#fff4df' },
  { body: '#f18c73', roof: '#c95f55', trim: '#fff4df' },
  { body: '#68a9dd', roof: '#3978b8', trim: '#fff4df' },
];

const NEXT_HOUSES = [
  { width: 158, height: 86 },
  { width: 186, height: 78 },
  { width: 132, height: 100 },
  { width: 172, height: 90 },
  { width: 198, height: 76 },
  { width: 148, height: 98 },
  { width: 180, height: 82 },
];

const MINI_INTERVAL_MIN = 2;
const MINI_INTERVAL_MAX = 4;

function randomMiniInterval() {
  return (
    MINI_INTERVAL_MIN +
    Math.floor(Math.random() * (MINI_INTERVAL_MAX - MINI_INTERVAL_MIN + 1))
  );
}

export type TowerStatus = 'ready' | 'moving' | 'settling' | 'over';

export interface HouseView {
  id: number;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  trimColor: string;
  windows: 2 | 3;
  mini: boolean;
}

export interface ActiveHouseView {
  x: number;
  y: number;
  width: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  trimColor: string;
  windows: 2 | 3;
  mini: boolean;
}

export interface TowerGameSnapshot {
  status: TowerStatus;
  houses: HouseView[];
  activeHouse: ActiveHouseView | null;
  cameraOffset: number;
  sessionEarnings: number;  // заработано за игровую сессию
  placedCount: number;
  bestHeight: number;
  lives: number;
  lastAward: number | null;
  rewardPerHouse: number;   // текущая награда за домик (с множителем)
}

interface HouseData {
  id: number;
  width: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  trimColor: string;
  windows: 2 | 3;
  mini: boolean;
  body: Body;
}

function colorFor(id: number) {
  return HOUSE_COLORS[(id % HOUSE_COLORS.length + HOUSE_COLORS.length) % HOUSE_COLORS.length];
}

function getBestHeight() {
  try {
    return Number(window.localStorage.getItem('domiki-tower-best') || 0);
  } catch {
    return 0;
  }
}

function buildHouse(
  id: number,
  x: number,
  y: number,
  width: number,
  height: number,
  isStatic = false,
  mini = false,
): HouseData {
  const color = colorFor(id);
  const body = Bodies.rectangle(x, y, width, height, {
    isStatic,
    friction: 0.83,
    frictionStatic: 0.96,
    restitution: 0.025,
    density: 0.0021,
    slop: 0.7,
    chamfer: { radius: 2 },
    label: `house-${id}`,
  });

  return {
    id,
    width,
    height,
    bodyColor: color.body,
    roofColor: color.roof,
    trimColor: color.trim,
    windows: id % 3 === 1 ? 3 : 2,
    mini,
    body,
  };
}

function snapshotHouse(house: HouseData): HouseView {
  return {
    id: house.id,
    x: house.body.position.x,
    y: house.body.position.y,
    angle: house.body.angle,
    width: house.width,
    height: house.height,
    bodyColor: house.bodyColor,
    roofColor: house.roofColor,
    trimColor: house.trimColor,
    windows: house.windows,
    mini: house.mini,
  };
}

export function useTowerGame(
  activeBet: number,
  onHousePlaced: (reward: number) => void,
  onGameOver: (won: boolean) => void,
) {
  const engineRef = useRef<Engine | null>(null);
  const housesRef = useRef<HouseData[]>([]);
  const groundRef = useRef<Body | null>(null);
  const activeRef = useRef<ActiveHouseView | null>(null);
  const cameraOffsetRef = useRef(0);
  const cameraTargetRef = useRef(0);
  const placedSinceMiniRef = useRef(0);
  const miniIntervalRef = useRef(2);
  const statusRef = useRef<TowerStatus>('ready');
  const nextIdRef = useRef(0);
  const waveRef = useRef(0);
  const stableFramesRef = useRef(0);
  const dropAgeRef = useRef(0);
  const failedRef = useRef(false);

  // Храним текущую ставку в ref чтобы не пересоздавать колбэки
  const activeBetRef = useRef(activeBet);
  activeBetRef.current = activeBet;

  const onHousePlacedRef = useRef(onHousePlaced);
  onHousePlacedRef.current = onHousePlaced;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const valuesRef = useRef({
    sessionEarnings: 0,
    placedCount: 0,
    bestHeight: getBestHeight(),
    lives: STARTING_LIVES,
    lastAward: null as number | null,
  });

  const [snapshot, setSnapshot] = useState<TowerGameSnapshot>({
    status: 'ready',
    houses: [],
    activeHouse: null,
    cameraOffset: 0,
    sessionEarnings: 0,
    placedCount: 0,
    bestHeight: valuesRef.current.bestHeight,
    lives: STARTING_LIVES,
    lastAward: null,
    rewardPerHouse: BASE_REWARD_PER_HOUSE,
  });

  const getRewardPerHouse = useCallback(() => {
    const multiplier = getBetMultiplier(activeBetRef.current);
    return Math.round(BASE_REWARD_PER_HOUSE * multiplier);
  }, []);

  const setupWorld = useCallback(() => {
    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.12;
    engine.gravity.scale = 0.001;
    const ground = Bodies.rectangle(WIDTH / 2, GROUND_Y + 23, WIDTH * 3, 46, {
      isStatic: true,
      friction: 0.96,
      label: 'ground',
    });
    World.add(engine.world, ground);

    const base = [{ width: 208, height: 92, x: 220 }];
    let y = GROUND_Y;
    housesRef.current = base.map((size, index) => {
      const centerY = y - size.height / 2;
      y -= size.height;
      return buildHouse(-3 + index, size.x, centerY, size.width, size.height, true);
    });
    World.add(engine.world, housesRef.current.map((house) => house.body));

    engineRef.current = engine;
    groundRef.current = ground;
    nextIdRef.current = 0;
    stableFramesRef.current = 0;
    dropAgeRef.current = 0;
    failedRef.current = false;
    placedSinceMiniRef.current = 0;
    miniIntervalRef.current = randomMiniInterval();
    statusRef.current = 'ready';
    activeRef.current = null;
    cameraOffsetRef.current = 0;
    cameraTargetRef.current = 0;
  }, []);

  const nextActiveHouse = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const id = nextIdRef.current;
    const size = NEXT_HOUSES[id % NEXT_HOUSES.length];
    const color = colorFor(id);
    const mini = placedSinceMiniRef.current >= miniIntervalRef.current;
    const top = Math.min(
      ...housesRef.current.map((house) => house.body.position.y - house.height / 2),
    );
    activeRef.current = {
      x: 220,
      y: top - size.height / 2 - 54,
      width: mini ? Math.round(size.width * 0.68) : size.width,
      height: mini ? Math.round(size.height * 0.78) : size.height,
      bodyColor: color.body,
      roofColor: color.roof,
      trimColor: color.trim,
      windows: id % 3 === 1 ? 3 : 2,
      mini,
    };
    statusRef.current = 'moving';
  }, []);

  const startGame = useCallback(() => {
    if (statusRef.current !== 'ready' && statusRef.current !== 'over') return;
    if (statusRef.current === 'over') {
      const values = valuesRef.current;
      values.sessionEarnings = 0;
      values.placedCount = 0;
      values.lives = STARTING_LIVES;
      values.lastAward = null;
      setupWorld();
    }
    nextActiveHouse();
  }, [nextActiveHouse, setupWorld]);

  const dropHouse = useCallback(() => {
    if (statusRef.current !== 'moving' || !activeRef.current || !engineRef.current) return;
    const active = activeRef.current;
    const id = nextIdRef.current;
    const newHouse = buildHouse(
      id,
      active.x,
      active.y,
      active.width,
      active.height,
      false,
      active.mini,
    );
    const direction = Math.cos(waveRef.current) * 0.22;
    Body.setVelocity(newHouse.body, { x: direction, y: 0 });
    housesRef.current.push(newHouse);
    World.add(engineRef.current.world, newHouse.body);
    nextIdRef.current += 1;
    activeRef.current = null;
    statusRef.current = 'settling';
    stableFramesRef.current = 0;
    dropAgeRef.current = 0;
    failedRef.current = false;
  }, []);

  const restartGame = useCallback(() => {
    const values = valuesRef.current;
    values.sessionEarnings = 0;
    values.placedCount = 0;
    values.lives = STARTING_LIVES;
    values.lastAward = null;
    setupWorld();
    nextActiveHouse();
  }, [nextActiveHouse, setupWorld]);

  useEffect(() => {
    setupWorld();
    return () => {
      if (engineRef.current) Engine.clear(engineRef.current);
      if (engineRef.current && groundRef.current) {
        World.clear(engineRef.current.world, false);
      }
      engineRef.current = null;
    };
  }, [setupWorld]);

  useEffect(() => {
    let frame = 0;
    let previousTime = 0;

    const publish = () => {
      const values = valuesRef.current;
      setSnapshot({
        status: statusRef.current,
        houses: housesRef.current.map(snapshotHouse),
        activeHouse: activeRef.current ? { ...activeRef.current } : null,
        cameraOffset: cameraOffsetRef.current,
        sessionEarnings: values.sessionEarnings,
        placedCount: values.placedCount,
        bestHeight: values.bestHeight,
        lives: values.lives,
        lastAward: values.lastAward,
        rewardPerHouse: getRewardPerHouse(),
      });
    };

    const tick = (time: number) => {
      const engine = engineRef.current;
      if (engine) {
        const delta = Math.min(time - (previousTime || time), 16.667);
        previousTime = time;
        waveRef.current += delta * 0.0018;
        cameraOffsetRef.current +=
          (cameraTargetRef.current - cameraOffsetRef.current) * 0.085;
        if (Math.abs(cameraTargetRef.current - cameraOffsetRef.current) < 0.15) {
          cameraOffsetRef.current = cameraTargetRef.current;
        }

        if (statusRef.current === 'moving' && activeRef.current) {
          const active = activeRef.current;
          const top = Math.min(
            ...housesRef.current.map((house) => house.body.position.y - house.height / 2),
          );
          const amplitude = Math.max(64, Math.min(154, 212 - active.width / 2));
          active.x = WIDTH / 2 + Math.sin(waveRef.current) * amplitude;
          active.y = top - active.height / 2 - 54;
        }

        if (statusRef.current === 'settling') {
          Engine.update(engine, delta || 16.667);
          dropAgeRef.current += delta;
          const newest = housesRef.current[housesRef.current.length - 1];
          if (newest && groundRef.current) {
            const otherHouses = housesRef.current
              .slice(0, -1)
              .map((house) => house.body);
            const isSupportedByHouse =
              Query.collides(newest.body, otherHouses).length > 0;
            const isSupportedByGround =
              Query.collides(newest.body, [groundRef.current]).length > 0;
            const speed =
              Math.abs(newest.body.velocity.x) +
              Math.abs(newest.body.velocity.y) +
              Math.abs(newest.body.angularVelocity) * 20;
            const offStage =
              newest.body.position.x < -20 || newest.body.position.x > WIDTH + 20;
            const missedTower =
              isSupportedByGround && !isSupportedByHouse && dropAgeRef.current > 800;
            const unsupportedTimeout = dropAgeRef.current > 4500 && !isSupportedByHouse;

            if (!failedRef.current && (offStage || missedTower || unsupportedTimeout)) {
              failedRef.current = true;
              valuesRef.current.lives -= 1;
              housesRef.current = housesRef.current.filter(
                (house) => house.body.isStatic,
              );
              for (const house of engine.world.bodies.slice()) {
                if (!house.isStatic && house.label.startsWith('house-')) {
                  World.remove(engine.world, house);
                }
              }
              stableFramesRef.current = 0;
              if (valuesRef.current.lives <= 0) {
                statusRef.current = 'over';
                activeRef.current = null;
                onGameOverRef.current(false);
              } else {
                statusRef.current = 'moving';
                nextActiveHouse();
              }
            } else if (
              isSupportedByHouse &&
              speed < 0.25 &&
              dropAgeRef.current > 380
            ) {
              stableFramesRef.current += 1;
              if (stableFramesRef.current > 18) {
                const reward = getRewardPerHouse();
                valuesRef.current.placedCount += 1;
                valuesRef.current.sessionEarnings += reward;
                valuesRef.current.lastAward = reward;

                // Уведомляем внешний хук о награде
                onHousePlacedRef.current(reward);

                if (newest.mini) {
                  placedSinceMiniRef.current = 0;
                  miniIntervalRef.current = randomMiniInterval();
                } else {
                  placedSinceMiniRef.current += 1;
                }
                valuesRef.current.bestHeight = Math.max(
                  valuesRef.current.bestHeight,
                  valuesRef.current.placedCount,
                );
                const towerTop = Math.min(
                  ...housesRef.current.map(
                    (house) => house.body.position.y - house.height / 2,
                  ),
                );
                cameraTargetRef.current = Math.max(0, CAMERA_ANCHOR_Y - towerTop);
                try {
                  window.localStorage.setItem(
                    'domiki-tower-best',
                    String(valuesRef.current.bestHeight),
                  );
                } catch {
                  // ignore
                }
                Sleeping.set(newest.body, true);
                nextActiveHouse();
              }
            } else {
              stableFramesRef.current = 0;
            }
          }
        }
        publish();
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [nextActiveHouse, getRewardPerHouse]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['BUTTON', 'INPUT', 'TEXTAREA'].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      if (statusRef.current === 'ready' || statusRef.current === 'over') {
        startGame();
      } else if (statusRef.current === 'moving') {
        dropHouse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dropHouse, startGame]);

  return { snapshot, startGame, dropHouse, restartGame, stageWidth: WIDTH, stageHeight: HEIGHT };
}
