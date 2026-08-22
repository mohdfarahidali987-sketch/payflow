import mongoose from "mongoose";
import { Transaction } from "../models/transaction.js";

const MAX_RETRIES = 3;

export async function executeRecoveryAction(
  transactionId: string
) {
  if (!mongoose.Types.ObjectId.isValid(transactionId)) {
    throw new Error("Invalid transaction ID");
  }

  const transaction =
    await Transaction.findById(transactionId);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (transaction.status !== "FAILED") {
    throw new Error(
      "Only failed transactions can be recovered"
    );
  }

  if (
    transaction.recoveryStatus !==
    "ACTION_SCHEDULED"
  ) {
    throw new Error(
      "Recovery action has not been scheduled"
    );
  }

  if (
    (transaction.retryCount ?? 0) >= MAX_RETRIES
  ) {
    transaction.recoveryStatus = "ESCALATED";

    transaction.recoveryAction = "ESCALATE";

    transaction.recoveryReasoning +=
      " Maximum retry limit reached.";

    await transaction.save();

    return {
      success: false,
      status: "ESCALATED",
      recoveredAmount: 0,
      retryCount: transaction.retryCount ?? 0,
      message:
        "Maximum retry limit reached. Manual intervention required.",
    };
  }

  const action = transaction.recoveryAction;

  if (
    action !== "RETRY_NOW" &&
    action !== "RETRY_LATER"
  ) {
    transaction.recoveryStatus = "ESCALATED";

    transaction.recoveryAction = "ESCALATE";

    transaction.recoveryReasoning +=
      " Automatic retry was not allowed for this action.";

    await transaction.save();

    return {
      success: false,
      status: "ESCALATED",
      recoveredAmount: 0,
      retryCount: transaction.retryCount ?? 0,
      message:
        "Payment requires manual intervention.",
    };
  }

  /*
   * Demo recovery simulation.
   *
   * Production:
   * replace this block with the actual
   * payment-provider retry API.
   */

  const probability =
    Math.max(
      0,
      Math.min(
        100,
        transaction.recoveryProbability ?? 0
      )
    );

  const recovered =
    Math.random() * 100 < probability;

  transaction.retryCount =
    (transaction.retryCount ?? 0) + 1;

  if (recovered) {
    transaction.status = "SUCCESS";
    transaction.recoveryStatus = "RECOVERED";
    transaction.recoveredAmount =
      transaction.amount;

    transaction.recoveryReasoning +=
      " Recovery agent successfully simulated payment recovery.";

    await transaction.save();

    return {
      success: true,
      status: "RECOVERED",
      recoveredAmount: transaction.amount,
      retryCount: transaction.retryCount,
    };
  }

  if (transaction.retryCount >= MAX_RETRIES) {
    transaction.recoveryStatus = "ESCALATED";
    transaction.recoveryAction = "ESCALATE";
  } else {
    transaction.recoveryStatus = "FAILED";
  }

  transaction.recoveryReasoning +=
    " Recovery attempt failed.";

  await transaction.save();

  return {
    success: false,
    status: transaction.recoveryStatus,
    recoveredAmount: 0,
    retryCount: transaction.retryCount,
  };
}