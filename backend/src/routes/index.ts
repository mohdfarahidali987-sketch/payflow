import { Router } from "express";
import userRouter from "./user.js";
import accountRouter from "./account.js";
import transactionsRouter from "./transactions.js";
import analyticsRouter from "./analytics.js";
import aiRouter from "./ai.js";

const router = Router();
router.use("/user", userRouter);
router.use("/account", accountRouter);
router.use("/transactions", transactionsRouter);
router.use("/analytics", analyticsRouter);
router.use("/ai", aiRouter);

export default router;
