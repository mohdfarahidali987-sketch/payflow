import mongoose from "mongoose";
import { Transaction } from "../models/transaction.js";

/**
 * Statistical anomaly detection based on historical outgoing amounts.
 * Uses mean + 2 * standard deviation. Not fraud detection / not ML.
 */
export async function detectAmountAnomaly(
  userId: string,
  amount: number
): Promise<{ isAnomaly: boolean; reason?: string; mean?: number; stdDev?: number }> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const history = await Transaction.find({
    senderId: userObjectId,
    status: "SUCCESS",
  })
    .select("amount")
    .limit(100)
    .lean();

  if (history.length < 5) {
    return { isAnomaly: false };
  }

  const amounts = history.map((tx) => tx.amount);
  const mean = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, value) => sum + (value - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Require meaningful spread; flag amounts far above typical spend
  const threshold = mean + Math.max(2 * stdDev, mean);

  if (amount > threshold && amount > mean * 2) {
    return {
      isAnomaly: true,
      mean: Number(mean.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      reason:
        "This transaction is significantly higher than your typical transaction amount.",
    };
  }

  return {
    isAnomaly: false,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
  };
}
