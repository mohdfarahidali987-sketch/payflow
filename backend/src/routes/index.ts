import { Router } from "express";
import userRouter from "./user.js";
import accountRouter from "./account.js";
import transactionsRouter from "./transactions.js";

const router = Router();
router.use("/user", userRouter);
router.use("/account", accountRouter);
router.use("/transactions", transactionsRouter);

export default router;
