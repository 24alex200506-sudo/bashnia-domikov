/**
 * Простое хранилище балансов в памяти + JSON-файл.
 * Ключ — Telegram user_id (число).
 *
 * Для продакшена замените на базу данных.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "balances.json");

interface BalanceRecord {
  userId: number;
  username: string;
  balance: number;
  updatedAt: string;
}

type BalanceMap = Record<string, BalanceRecord>;

function load(): BalanceMap {
  try {
    if (existsSync(DATA_FILE)) {
      return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as BalanceMap;
    }
  } catch {
    // ignore
  }
  return {};
}

function save(data: BalanceMap): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

// Кэш в памяти
let cache: BalanceMap = load();

export function getBalance(userId: number): number {
  return cache[String(userId)]?.balance ?? 0;
}

export function getRecord(userId: number): BalanceRecord | null {
  return cache[String(userId)] ?? null;
}

export function addBalance(userId: number, username: string, amount: number): number {
  const key = String(userId);
  const prev = cache[key]?.balance ?? 0;
  const newBalance = Math.max(0, prev + amount);
  cache[key] = {
    userId,
    username,
    balance: newBalance,
    updatedAt: new Date().toISOString(),
  };
  save(cache);
  return newBalance;
}

export function setBalance(userId: number, username: string, amount: number): number {
  const key = String(userId);
  cache[key] = {
    userId,
    username,
    balance: Math.max(0, amount),
    updatedAt: new Date().toISOString(),
  };
  save(cache);
  return cache[key].balance;
}

export function getAllRecords(): BalanceRecord[] {
  return Object.values(cache);
}

export function findByUsername(username: string): BalanceRecord | null {
  const u = username.replace(/^@/, "").toLowerCase();
  return Object.values(cache).find(r => r.username.toLowerCase() === u) ?? null;
}
