import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { Account } from "../models/account.js";
import { Transaction } from "../models/transaction.js";
import mongoose from "mongoose";

const router = Router();

function monthBounds(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function previousMonthBounds(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const end = new Date(base.getFullYear(), base.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

router.get("/overview", auth, async (req, res) => {
  const userObjectId = new mongoose.Types.ObjectId(req.userId);
  const { start, end } = monthBounds();

  const account = await Account.findOne({ userId: req.userId }).lean();

  const [totals, categorySpend, recent, monthlyTrend] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          status: "SUCCESS",
          createdAt: { $gte: start, $lte: end },
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$receiverId", userObjectId] }, "$amount", 0],
            },
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ["$senderId", userObjectId] }, "$amount", 0],
            },
          },
          transactionCount: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          status: "SUCCESS",
          senderId: userObjectId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Transaction.find({
      status: "SUCCESS",
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("senderId", "firstName lastName")
      .populate("receiverId", "firstName lastName")
      .lean(),
    Transaction.aggregate([
      {
        $match: {
          status: "SUCCESS",
          $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          income: {
            $sum: {
              $cond: [{ $eq: ["$receiverId", userObjectId] }, "$amount", 0],
            },
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ["$senderId", userObjectId] }, "$amount", 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const summary = totals[0] || {
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
  };

  return res.json({
    currentBalance: account?.balance ?? 0,
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    transactionCount: summary.transactionCount,
    spendingByCategory: categorySpend.map((row) => ({
      category: row._id,
      total: row.total,
      count: row.count,
    })),
    monthlyTrend: monthlyTrend.map((row) => ({
      year: row._id.year,
      month: row._id.month,
      income: row.income,
      expenses: row.expenses,
    })),
    recentTransactions: recent.map((tx) => {
      const isOutgoing = String(tx.senderId._id ?? tx.senderId) === req.userId;
      return {
        transactionId: tx._id,
        amount: tx.amount,
        direction: isOutgoing ? "DEBIT" : "CREDIT",
        category: tx.category,
        description: tx.description,
        status: tx.status,
        sender: tx.senderId,
        receiver: tx.receiverId,
        createdAt: tx.createdAt,
      };
    }),
  });
});

router.get("/comparison", auth, async (req, res) => {
  const userObjectId = new mongoose.Types.ObjectId(req.userId);
  const current = monthBounds();
  const previous = previousMonthBounds();

  async function expenseTotal(start: Date, end: Date) {
    const result = await Transaction.aggregate([
      {
        $match: {
          status: "SUCCESS",
          senderId: userObjectId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  }

  const [currentExpenses, previousExpenses] = await Promise.all([
    expenseTotal(current.start, current.end),
    expenseTotal(previous.start, previous.end),
  ]);

  const changePercent =
    previousExpenses === 0
      ? currentExpenses > 0
        ? 100
        : 0
      : ((currentExpenses - previousExpenses) / previousExpenses) * 100;

  return res.json({
    currentMonthExpenses: currentExpenses,
    previousMonthExpenses: previousExpenses,
    changePercent: Number(changePercent.toFixed(2)),
  });
});

export default router;
