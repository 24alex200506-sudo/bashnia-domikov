/**
 * GET /api/balance/:userId  — возвращает баланс пользователя
 * Вызывается мини-аппом при старте чтобы синхронизировать баланс с сервером.
 */
import { Router } from "express";
import { getBalance, getRecord } from "../lib/balanceStore.js";

const balanceRouter = Router();

balanceRouter.get("/balance/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  if (!isFinite(userId) || userId <= 0) {
    res.status(400).json({ error: "invalid userId" });
    return;
  }
  const record = getRecord(userId);
  res.json({
    userId,
    balance: getBalance(userId),
    username: record?.username ?? "",
    updatedAt: record?.updatedAt ?? null,
  });
});

export default balanceRouter;
