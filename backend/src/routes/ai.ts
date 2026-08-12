import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { auth } from "../middleware/auth.js";
import { Transaction } from "../models/transaction.js";
import {
  askFinanceAssistant,
  generateMonthlySummary,
  generateSpendingInsight,
  isAiConfigured,
} from "../services/ai.js";

const router = Router();

const assistantSchema = z.object({
  question: z.string().trim().min(3).max(500),
});

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

async function buildUserFinanceContext(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const current = monthBounds();
  const previous = previousMonthBounds();

  const [thisMonth, lastMonth, recent] = await Promise.all([
    Transaction.find({
      status: "SUCCESS",
      createdAt: { $gte: current.start, $lte: current.end },
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Transaction.find({
      status: "SUCCESS",
      createdAt: { $gte: previous.start, $lte: previous.end },
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .lean(),
    Transaction.find({
      status: "SUCCESS",
      $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const summarize = (txs: typeof thisMonth) => {
    let income = 0;
    let expenses = 0;
    const byCategory: Record<string, number> = {};

    for (const tx of txs) {
      const outgoing = String(tx.senderId) === userId;
      if (outgoing) {
        expenses += tx.amount;
        byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount;
      } else {
        income += tx.amount;
      }
    }

    return { income, expenses, byCategory, count: txs.length };
  };

  const currentSummary = summarize(thisMonth);
  const previousSummary = summarize(lastMonth);

  const recentLines = recent.map((tx) => {
    const outgoing = String(tx.senderId) === userId;
    return `${tx.createdAt.toISOString().slice(0, 10)} | ${outgoing ? "DEBIT" : "CREDIT"} | ₹${tx.amount} | ${tx.category} | ${tx.description || "no description"}${tx.isAnomaly ? " | ANOMALY" : ""}`;
  });

  return {
    currentSummary,
    previousSummary,
    text: [
      `Current month income: ₹${currentSummary.income}`,
      `Current month expenses: ₹${currentSummary.expenses}`,
      `Current month transactions: ${currentSummary.count}`,
      `Spending by category (current month): ${JSON.stringify(currentSummary.byCategory)}`,
      `Previous month income: ₹${previousSummary.income}`,
      `Previous month expenses: ₹${previousSummary.expenses}`,
      `Recent transactions:`,
      ...recentLines,
    ].join("\n"),
  };
}

router.get("/status", auth, async (_req, res) => {
  return res.json({
    configured: isAiConfigured(),
    provider: "openai",
    model: process.env.AI_MODEL || "gpt-4o-mini",
  });
});

router.post("/assistant", auth, async (req, res) => {
  const parsed = assistantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid question" });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      message: "AI is not configured. Set AI_API_KEY on the backend.",
    });
  }

  try {
    const { text } = await buildUserFinanceContext(req.userId);
    const answer = await askFinanceAssistant(parsed.data.question, text);
    return res.json({ answer });
  } catch (error: any) {
  console.error("AI assistant error:", {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    type: error?.type,
    response: error?.response?.data,
  });

  return res.status(500).json({
    message: error?.message || "AI assistant unavailable",
  });
}
});

router.get("/insights", auth, async (req, res) => {
  if (!isAiConfigured()) {
    return res.status(503).json({
      message: "AI is not configured. Set AI_API_KEY on the backend.",
    });
  }

  try {
    const { text, currentSummary, previousSummary } = await buildUserFinanceContext(
      req.userId
    );

    if (currentSummary.count === 0) {
      return res.json({
        insight:
          "No transactions this month yet. Once you start sending or receiving money, PayFlow AI can generate spending insights.",
        stats: { currentSummary, previousSummary },
      });
    }

    const insight = await generateSpendingInsight(text);
    return res.json({
      insight,
      stats: { currentSummary, previousSummary },
    });
  } catch (error: any) {
  console.error("AI insights error:", {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    type: error?.type,
    response: error?.response?.data,
  });

  return res.status(500).json({
    message: error?.message || "AI insights unavailable",
  });
}
});

router.get("/monthly-summary", auth, async (req, res) => {
  if (!isAiConfigured()) {
    return res.status(503).json({
      message: "AI is not configured. Set AI_API_KEY on the backend.",
    });
  }

  try {
    const { text, currentSummary, previousSummary } = await buildUserFinanceContext(
      req.userId
    );

    const changePercent =
      previousSummary.expenses === 0
        ? currentSummary.expenses > 0
          ? 100
          : 0
        : Number(
            (
              ((currentSummary.expenses - previousSummary.expenses) /
                previousSummary.expenses) *
              100
            ).toFixed(2)
          );

    const topCategory = Object.entries(currentSummary.byCategory).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const summary = await generateMonthlySummary(
      `${text}\nExpense change vs previous month: ${changePercent}%\nTop category: ${
        topCategory ? `${topCategory[0]} ₹${topCategory[1]}` : "None"
      }`
    );

    return res.json({
      summary,
      totals: {
        income: currentSummary.income,
        expenses: currentSummary.expenses,
        topCategory: topCategory
          ? { category: topCategory[0], amount: topCategory[1] }
          : null,
        expenseChangePercent: changePercent,
      },
    });
  } catch (error: any) {
  console.error("AI monthly summary error:", {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    type: error?.type,
    response: error?.response?.data,
  });

  return res.status(500).json({
    message: error?.message || "Monthly summary unavailable",
  });
}
});

export default router;
