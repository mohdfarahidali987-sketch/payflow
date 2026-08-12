import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { Account } from "../models/account.js";
import { Transaction } from "../models/transaction.js";
import mongoose from "mongoose";
import { transferSchema } from "../validations/transaction.js";

const router = Router();

router.get("/balance", auth, async (req, res) => {
  const account = await Account.findOne({
    userId: req.userId,
  });

  return res.json({
    balance: account?.balance ?? 0,
  });
});

router.post("/transfer", auth, async (req, res) => {
  const result = transferSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "Invalid transfer request",
    });
  }

  const { to, amount, description, category } = result.data;

  if (to === req.userId) {
    return res.status(400).json({
      message: "Cannot transfer money to yourself",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(to)) {
    return res.status(400).json({
      message: "Invalid receiver id",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const account = await Account.findOne({
      userId: req.userId,
    }).session(session);

    if (!account || account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    const toAccount = await Account.findOne({
      userId: to,
    }).session(session);

    if (!toAccount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Receiver not found",
      });
    }

    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } }
    ).session(session);

    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    const [transaction] = await Transaction.create(
      [
        {
          senderId: req.userId,
          receiverId: to,
          amount,
          type: "TRANSFER",
          status: "SUCCESS",
          category,
          description: description || "",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return res.json({
      message: "Transfer successful",
      transactionId: transaction._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Transfer failed:", err);
    return res.status(500).json({
      message: "Transfer failed",
    });
  } finally {
    session.endSession();
  }
});

export default router;
