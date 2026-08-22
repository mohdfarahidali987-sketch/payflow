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
  generateRecoveryDecision,
} from "../services/ai.js";
import { predictRecovery } from "../services/ml.js";
import { detectAmountAnomaly } from "../services/anomaly.js";
import { executeRecoveryAction } from "../services/recoveryAgent.js";
import { validateRecoveryDecision } from "../services/reciveryPolicy.js";


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
    provider: "groq",
    model:
      process.env.AI_MODEL ||
      "openai/gpt-oss-20b",
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

const paymentAnalysisSchema = z.object({
  transactionId: z.string().min(1),
});

router.post("/analyze-payment", auth, async (req, res) => {
  const parsed = paymentAnalysisSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid transaction ID",
    });
  }

  const { transactionId } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    return res.status(400).json({
      message: "Invalid transaction ID",
    });
  }

  try {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const senderId = String(transaction.senderId);
    const receiverId = String(transaction.receiverId);

    if (
      senderId !== req.userId &&
      receiverId !== req.userId
    ) {
      return res.status(403).json({
        message: "Not authorized to analyze this transaction",
      });
    }

    if (transaction.status !== "FAILED") {
      return res.status(400).json({
        message: "Only failed payments can be analyzed",
      });
    }

    const anomaly = await detectAmountAnomaly(
      senderId,
      transaction.amount
    );

    const successfulTransactions = await Transaction.countDocuments({
      senderId: transaction.senderId,
      status: "SUCCESS",
    });

    const totalTransactions = await Transaction.countDocuments({
      senderId: transaction.senderId,
      status: { $in: ["SUCCESS", "FAILED"] },
    });

    const customerSuccessRate =
      totalTransactions === 0
        ? 0.5
        : successfulTransactions / totalTransactions;

    const mlResult = await predictRecovery({
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod || "UPI",
      failureReason: transaction.failureReason || "UNKNOWN",
      retryCount: transaction.retryCount || 0,
      customerSuccessRate,
      isAnomaly: anomaly.isAnomaly,
    });

    transaction.isAnomaly = anomaly.isAnomaly;
    transaction.recoveryProbability =
      mlResult.recovery_probability;

    transaction.recoveryStatus = "ANALYZED";

    await transaction.save();

    return res.json({
      transactionId: transaction._id,
      amount: transaction.amount,

      analysis: {
        recoveryProbability:
          mlResult.recovery_probability,

        riskLevel: mlResult.risk_level,

        anomaly: anomaly.isAnomaly,

        anomalyReason: anomaly.reason || null,

        customerSuccessRate: Number(
          (customerSuccessRate * 100).toFixed(2)
        ),
      },

      nextStep:
        mlResult.recovery_probability >= 75
          ? "HIGH_RECOVERY_POTENTIAL"
          : mlResult.recovery_probability >= 45
          ? "MODERATE_RECOVERY_POTENTIAL"
          : "LOW_RECOVERY_POTENTIAL",
    });
  } catch (error: any) {
    console.error("Payment analysis error:", error);

    return res.status(500).json({
      message:
        error?.message ||
        "Payment analysis failed",
    });
  }
});
const demoFailedPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum([
    "UPI",
    "CARD",
    "NET_BANKING",
    "WALLET",
  ]),
  failureReason: z.enum([
    "INSUFFICIENT_FUNDS",
    "BANK_ERROR",
    "NETWORK_ERROR",
    "TIMEOUT",
    "LIMIT_EXCEEDED",
    "INVALID_DETAILS",
    "UNKNOWN",
  ]),
  description: z.string().trim().max(200).optional(),
});

router.post("/demo/failed-payment", auth, async (req, res) => {
  const parsed = demoFailedPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid failed payment data",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const transaction = await Transaction.create({
      senderId: req.userId,
      receiverId: req.userId,
      amount: parsed.data.amount,
      type: "TRANSFER",
      status: "FAILED",
      category: "Other",
      description:
        parsed.data.description || "Demo failed payment",
      paymentMethod: parsed.data.paymentMethod,
      failureReason: parsed.data.failureReason,
      retryCount: 0,
      recoveryStatus: "NOT_ANALYZED",
    });

    return res.status(201).json({
      message: "Demo failed payment created",
      transactionId: transaction._id,
      transaction,
    });
  } catch (error: any) {
    console.error("Demo payment creation error:", error);

    return res.status(500).json({
      message: "Failed to create demo payment",
    });
  }
});

router.post("/recovery-decision", auth, async (req, res) => {
  const parsed = paymentAnalysisSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid transaction ID",
    });
  }

  const { transactionId } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    return res.status(400).json({
      message: "Invalid transaction ID",
    });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      message: "AI is not configured",
    });
  }

  try {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    /* -------------------------------------------------------
       Authorization
    ------------------------------------------------------- */

    const senderId = String(transaction.senderId);
    const receiverId = String(transaction.receiverId);

    if (
      senderId !== req.userId &&
      receiverId !== req.userId
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    /* -------------------------------------------------------
       Only failed payments can enter recovery
    ------------------------------------------------------- */

    if (transaction.status !== "FAILED") {
      return res.status(400).json({
        message: "Only failed payments can be recovered",
      });
    }

    /* -------------------------------------------------------
       ML analysis must happen first
    ------------------------------------------------------- */

    if (
      transaction.recoveryProbability === undefined ||
      transaction.recoveryProbability === null
    ) {
      return res.status(400).json({
        message:
          "Run payment analysis before requesting recovery decision",
      });
    }

    /* -------------------------------------------------------
       Build AI context
    ------------------------------------------------------- */

    const context = `
Payment amount: ₹${transaction.amount}

Payment method: ${
      transaction.paymentMethod || "UNKNOWN"
    }

Failure reason: ${
      transaction.failureReason || "UNKNOWN"
    }

Retry count: ${
      transaction.retryCount || 0
    }

Recovery probability: ${
      transaction.recoveryProbability
    }%

Risk level based on ML:
${
      transaction.recoveryProbability >= 75
        ? "LOW"
        : transaction.recoveryProbability >= 45
        ? "MEDIUM"
        : "HIGH"
    }

Anomaly detected:
${
      transaction.isAnomaly
        ? "YES"
        : "NO"
    }

Previous recovery status:
${
      transaction.recoveryStatus ||
      "NOT_ANALYZED"
    }
`;

    /* -------------------------------------------------------
       Step 1: Ask AI for a recommendation
    ------------------------------------------------------- */

    const aiDecision =
      await generateRecoveryDecision(context);

    /* -------------------------------------------------------
       Step 2: Apply deterministic safety policy
       AI is NOT the final authority.
    ------------------------------------------------------- */

    const safeDecision =
      validateRecoveryDecision(
        aiDecision,
        transaction.recoveryProbability,
        transaction.failureReason || "UNKNOWN",
        transaction.isAnomaly || false,
        transaction.retryCount || 0
      );

    /* -------------------------------------------------------
       Step 3: Save ONLY the policy-approved decision
    ------------------------------------------------------- */

    transaction.recoveryAction =
      safeDecision.action;

    transaction.recoveryReasoning =
      safeDecision.reasoning;

    if (
      safeDecision.decision === "RETRY_NOW" ||
      safeDecision.decision === "RETRY_LATER"
    ) {
      transaction.recoveryStatus =
        "ACTION_SCHEDULED";
    } else {
      transaction.recoveryStatus =
        "FAILED";
    }

    await transaction.save();

    /* -------------------------------------------------------
       Response
    ------------------------------------------------------- */

    return res.json({
      transactionId: transaction._id,

      ml: {
        recoveryProbability:
          transaction.recoveryProbability,

        anomaly:
          transaction.isAnomaly,

        riskLevel:
          transaction.recoveryProbability >= 75
            ? "LOW"
            : transaction.recoveryProbability >= 45
            ? "MEDIUM"
            : "HIGH",
      },

      aiDecision,

      finalDecision: safeDecision,

      recoveryStatus:
        transaction.recoveryStatus,
    });
  } catch (error: any) {
    console.error(
      "Recovery decision error:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Recovery decision failed",
    });
  }
});

router.post("/execute-recovery", auth, async (req, res) => {
  const parsed = paymentAnalysisSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid transaction ID",
    });
  }

  const { transactionId } = parsed.data;

  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    return res.status(400).json({
      message: "Invalid transaction ID",
    });
  }

  try {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const senderId = String(transaction.senderId);
    const receiverId = String(transaction.receiverId);

    if (
      senderId !== req.userId &&
      receiverId !== req.userId
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const result = await executeRecoveryAction(
      transactionId
    );

    return res.json({
      transactionId,
      recovery: result,
    });
  } catch (error: any) {
    console.error(
      "Recovery execution error:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Recovery execution failed",
    });
  }
});

export default router;
