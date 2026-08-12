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
