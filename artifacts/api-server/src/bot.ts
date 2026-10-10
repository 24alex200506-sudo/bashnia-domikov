/**
 * Telegram-бот для управления балансом игроков.
 *
 * Запуск:
 *   BOT_TOKEN=<твой_токен> MINI_APP_URL=https://твой-сайт.com node dist/bot.mjs
 *
 * Команды (только для администраторов):
 *   /add @username 500    — добавить 500₽ игроку
 *   /set @username 1000   — установить баланс в 1000₽
 *   /balance @username    — посмотреть баланс
 *   /list                 — список всех игроков с балансами
 *
 * Команды для игроков:
 *   /start  — открыть мини-апп
 *   /me     — посмотреть свой баланс
 */

import { addBalance, setBalance, getBalance, getRecord, getAllRecords, findByUsername } from "./lib/balanceStore.js";

// ── Типы Telegram Bot API (минимальные) ────────────────────────────────────

interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
}

interface TgMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: TgUser;
  text?: string;
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

// ── Конфигурация ────────────────────────────────────────────────────────────

const BOT_TOKEN   = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL ?? "https://t.me/your_bot/game";

// ID администраторов — добавь свои Telegram user_id через запятую в env
// Пример: ADMIN_IDS=123456789,987654321
const ADMIN_IDS: Set<number> = new Set(
  (process.env.ADMIN_IDS ?? "")
    .split(",")
    .map(s => Number(s.trim()))
    .filter(n => isFinite(n) && n > 0)
);

if (!BOT_TOKEN) {
  console.error("❌  BOT_TOKEN не задан. Укажи переменную окружения BOT_TOKEN.");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Запрос к Telegram API ───────────────────────────────────────────────────

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  // timeout чуть больше чем long-poll timeout (25s) + запас
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);
  try {
    const res = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json() as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`Telegram: ${data.description}`);
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

function sendMessage(chatId: number, text: string, extra?: Record<string, unknown>) {
  return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

// ── Обработчик сообщений ────────────────────────────────────────────────────

function isAdmin(userId: number): boolean {
  return ADMIN_IDS.has(userId);
}

function formatBalance(balance: number): string {
  return balance.toLocaleString("ru") + " ₽";
}

async function handleMessage(msg: TgMessage) {
  const chatId = msg.chat.id;
  const fromId = msg.from?.id ?? 0;
  const text   = (msg.text ?? "").trim();
  const fromUsername = msg.from?.username ?? msg.from?.first_name ?? "Игрок";

  // /start — открыть мини-апп
  if (text.startsWith("/start")) {
    const balance = getBalance(fromId);
    await sendMessage(chatId,
      `🏠 <b>Башня домиков</b>\n\n` +
      `Привет, ${fromUsername}!\n` +
      `Твой баланс: <b>${formatBalance(balance)}</b>\n\n` +
      `Нажми кнопку ниже, чтобы открыть игру 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🎮 Открыть игру",
              web_app: { url: MINI_APP_URL },
            },
          ]],
        },
      }
    );
    return;
  }

  // /me — свой баланс
  if (text === "/me") {
    const balance = getBalance(fromId);
    await sendMessage(chatId,
      `💰 Твой баланс: <b>${formatBalance(balance)}</b>`
    );
    return;
  }

  // ── Админские команды ──

  if (text.startsWith("/add") || text.startsWith("/set") || text.startsWith("/balance") || text === "/list") {
    if (!isAdmin(fromId)) {
      await sendMessage(chatId, "⛔️ Эта команда только для администраторов.");
      return;
    }

    // /list — все балансы
    if (text === "/list") {
      const records = getAllRecords().sort((a, b) => b.balance - a.balance);
      if (records.length === 0) {
        await sendMessage(chatId, "📋 Игроков пока нет.");
        return;
      }
      const lines = records
        .slice(0, 30)
        .map((r, i) => `${i + 1}. @${r.username} — <b>${formatBalance(r.balance)}</b>`);
      await sendMessage(chatId, `📋 <b>Балансы игроков:</b>\n\n${lines.join("\n")}`);
      return;
    }

    // /balance @username
    if (text.startsWith("/balance")) {
      const parts = text.split(/\s+/);
      const targetUsername = parts[1];
      if (!targetUsername) {
        await sendMessage(chatId, "Использование: /balance @username");
        return;
      }
      const record = findByUsername(targetUsername);
      if (!record) {
        await sendMessage(chatId, `❓ Игрок <b>${targetUsername}</b> не найден.`);
        return;
      }
      await sendMessage(chatId,
        `💰 @${record.username}: <b>${formatBalance(record.balance)}</b>`
      );
      return;
    }

    // /add @username <сумма>
    if (text.startsWith("/add")) {
      const parts = text.split(/\s+/);
      // /add @username 500
      if (parts.length < 3) {
        await sendMessage(chatId, "Использование: /add @username 500");
        return;
      }
      const targetUsername = parts[1];
      const amount = Number(parts[2]);
      if (!isFinite(amount) || amount <= 0) {
        await sendMessage(chatId, "❌ Некорректная сумма. Пример: /add @username 500");
        return;
      }

      // Ищем игрока по username
      let record = findByUsername(targetUsername);
      if (!record) {
        await sendMessage(chatId,
          `❓ Игрок <b>${targetUsername}</b> не найден.\n` +
          `Игрок должен хотя бы раз запустить бота (/start).`
        );
        return;
      }

      const newBalance = addBalance(record.userId, record.username, amount);
      await sendMessage(chatId,
        `✅ Готово!\n` +
        `👤 @${record.username}\n` +
        `➕ +${formatBalance(amount)}\n` +
        `💰 Новый баланс: <b>${formatBalance(newBalance)}</b>`
      );

      // Уведомляем самого игрока
      try {
        await sendMessage(record.userId,
          `🎁 Администратор пополнил твой баланс!\n` +
          `➕ <b>+${formatBalance(amount)}</b>\n` +
          `💰 Текущий баланс: <b>${formatBalance(newBalance)}</b>\n\n` +
          `Удачи в игре! 🏠`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "🎮 Играть", web_app: { url: MINI_APP_URL } },
              ]],
            },
          }
        );
      } catch {
        // Игрок мог заблокировать бота — не критично
      }
      return;
    }

    // /set @username <сумма>
    if (text.startsWith("/set")) {
      const parts = text.split(/\s+/);
      if (parts.length < 3) {
        await sendMessage(chatId, "Использование: /set @username 1000");
        return;
      }
      const targetUsername = parts[1];
      const amount = Number(parts[2]);
      if (!isFinite(amount) || amount < 0) {
        await sendMessage(chatId, "❌ Некорректная сумма.");
        return;
      }
      const record = findByUsername(targetUsername);
      if (!record) {
        await sendMessage(chatId, `❓ Игрок <b>${targetUsername}</b> не найден.`);
        return;
      }
      const newBalance = setBalance(record.userId, record.username, amount);
      await sendMessage(chatId,
        `✅ Баланс установлен!\n` +
        `👤 @${record.username}\n` +
        `💰 Баланс: <b>${formatBalance(newBalance)}</b>`
      );
      return;
    }
  }

  // Регистрируем пользователя при любом сообщении — всегда обновляем username
  if (fromId > 0) {
    const existing = getRecord(fromId);
    if (!existing) {
      // Новый игрок — создаём запись с балансом 0
      setBalance(fromId, fromUsername, 0);
    } else if (existing.username !== fromUsername) {
      // Username изменился — обновляем
      setBalance(fromId, fromUsername, existing.balance);
    }
  }
}

// ── Long Polling ────────────────────────────────────────────────────────────

async function startPolling() {
  console.log("🤖 Бот запущен. Ожидаю сообщений...");
  console.log(`   Мини-апп: ${MINI_APP_URL}`);
  console.log(`   Администраторы: ${ADMIN_IDS.size > 0 ? [...ADMIN_IDS].join(", ") : "не заданы (добавь ADMIN_IDS)"}`);

  // Устанавливаем команды бота
  try {
    await call("setMyCommands", {
      commands: [
        { command: "start",   description: "Открыть игру" },
        { command: "me",      description: "Мой баланс" },
      ],
    });
  } catch {
    // не критично
  }

  let offset = 0;
  while (true) {
    try {
      const updates = await call<TgUpdate[]>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          handleMessage(update.message).catch(e => {
            console.error("Ошибка обработки:", e);
          });
        }
      }
    } catch (e) {
      console.error("Ошибка polling:", e);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

startPolling();
