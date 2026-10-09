import { Router, type IRouter } from "express";
import healthRouter from "./health";
import balanceRouter from "./balance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(balanceRouter);

export default router;
