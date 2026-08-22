import mongoose from "mongoose";

export const TRANSACTION_CATEGORIES = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Entertainment",
  "Education",
  "Healthcare",
  "Other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_STATUSES = ["SUCCESS", "FAILED", "PENDING"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_TYPES = ["TRANSFER"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const PAYMENT_METHODS = [
  "UPI",
  "CARD",
  "NET_BANKING",
  "WALLET",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FAILURE_REASONS = [
  "INSUFFICIENT_FUNDS",
  "BANK_ERROR",
  "NETWORK_ERROR",
  "TIMEOUT",
  "LIMIT_EXCEEDED",
  "INVALID_DETAILS",
  "UNKNOWN",
] as const;

export type FailureReason = (typeof FAILURE_REASONS)[number];

export const RECOVERY_ACTIONS = [
  "RETRY_NOW",
  "RETRY_LATER",
  "SEND_REMINDER",
  "CHANGE_PAYMENT_METHOD",
  "ESCALATE",
  "NO_ACTION",
] as const;

export type RecoveryAction = (typeof RECOVERY_ACTIONS)[number];

export const RECOVERY_STATUSES = [
  "NOT_ANALYZED",
  "ANALYZED",
  "ACTION_SCHEDULED",
  "RECOVERED",
  "FAILED",
  "ESCALATED",
] as const;

export type RecoveryStatus = (typeof RECOVERY_STATUSES)[number];

const transactionSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      default: "TRANSFER",
      required: true,
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: "PENDING",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: TRANSACTION_CATEGORIES,
      default: "Other",
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    paymentMethod: {
  type: String,
  enum: PAYMENT_METHODS,
  default: "UPI",
},

failureReason: {
  type: String,
  enum: FAILURE_REASONS,
  default: "UNKNOWN",
},

retryCount: {
  type: Number,
  default: 0,
  min: 0,
},

recoveryProbability: {
  type: Number,
  min: 0,
  max: 100,
  default: null,
},

recoveryAction: {
  type: String,
  enum: RECOVERY_ACTIONS,
  default: "NO_ACTION",
},

recoveryStatus: {
  type: String,
  enum: RECOVERY_STATUSES,
  default: "NOT_ANALYZED",
},

recoveredAmount: {
  type: Number,
  min: 0,
  default: 0,
},

recoveryReasoning: {
  type: String,
  default: "",
  maxlength: 1000,
},
    isAnomaly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ senderId: 1, createdAt: -1 });
transactionSchema.index({ receiverId: 1, createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);


