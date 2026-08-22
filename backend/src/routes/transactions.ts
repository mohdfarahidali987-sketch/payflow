import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { Transaction } from "../models/transaction.js";
import { transactionQuerySchema } from "../validations/transaction.js";
import mongoose from "mongoose";

const router = Router();

router.get("/", auth, async (req, res) => {
  const parsed = transactionQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
    });
  }

  const { page, limit, search, category, status, sort, from, to } = parsed.data;
  const userObjectId = new mongoose.Types.ObjectId(req.userId);

  const filter: Record<string, unknown> = {
    $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
  };

  if (category) {
    filter.category = category;
  }

  if (status) {
    filter.status = status;
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) {
      const fromDate = new Date(from);
      if (Number.isNaN(fromDate.getTime())) {
        return res.status(400).json({ message: "Invalid from date" });
      }
      createdAt.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (Number.isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid to date" });
      }
      createdAt.$lte = toDate;
    }
    filter.createdAt = createdAt;
  }

  if (search.trim()) {
    filter.description = { $regex: search.trim(), $options: "i" };
  }

  let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
  if (sort === "oldest") sortOption = { createdAt: 1 };
  if (sort === "amount_asc") sortOption = { amount: 1 };
  if (sort === "amount_desc") sortOption = { amount: -1 };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("senderId", "firstName lastName username")
      .populate("receiverId", "firstName lastName username")
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  const transactions = items.map((tx) => {
    const isOutgoing = String(tx.senderId._id ?? tx.senderId) === req.userId;

    return {
      transactionId: tx._id,
      amount: tx.amount,
      type: tx.type,
      direction: isOutgoing ? "DEBIT" : "CREDIT",
      status: tx.status,
      category: tx.category,
      description: tx.description,
      isAnomaly: tx.isAnomaly,
      paymentMethod: tx.paymentMethod,
failureReason: tx.failureReason,
retryCount: tx.retryCount,
recoveryProbability: tx.recoveryProbability,
recoveryAction: tx.recoveryAction,
recoveryStatus: tx.recoveryStatus,
recoveredAmount: tx.recoveredAmount,
recoveryReasoning: tx.recoveryReasoning,
      sender: tx.senderId,
      receiver: tx.receiverId,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    };
  });

  return res.json({
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

router.get("/:id", auth, async (req, res) => {
  const id = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid transaction id" });
  }

  const tx = await Transaction.findById(id)
    .populate("senderId", "firstName lastName username")
    .populate("receiverId", "firstName lastName username")
    .lean();

  if (!tx) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  const senderId = String(tx.senderId._id ?? tx.senderId);
  const receiverId = String(tx.receiverId._id ?? tx.receiverId);

  if (senderId !== req.userId && receiverId !== req.userId) {
    return res.status(403).json({ message: "Not authorized to view this transaction" });
  }

  return res.json({
    transactionId: tx._id,
    amount: tx.amount,
    type: tx.type,
    direction: senderId === req.userId ? "DEBIT" : "CREDIT",
    status: tx.status,
    category: tx.category,
    description: tx.description,
    isAnomaly: tx.isAnomaly,
    paymentMethod: tx.paymentMethod,
failureReason: tx.failureReason,
retryCount: tx.retryCount,
recoveryProbability: tx.recoveryProbability,
recoveryAction: tx.recoveryAction,
recoveryStatus: tx.recoveryStatus,
recoveredAmount: tx.recoveredAmount,
recoveryReasoning: tx.recoveryReasoning,
    sender: tx.senderId,
    receiver: tx.receiverId,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  });
});

export default router;
