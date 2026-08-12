import { z } from "zod";
import { TRANSACTION_CATEGORIES } from "../models/transaction.js";

export const transferSchema = z.object({
  to: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().trim().max(200).optional().default(""),
  category: z.enum(TRANSACTION_CATEGORIES).optional().default("Other"),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().optional().default(""),
  category: z.enum(TRANSACTION_CATEGORIES).optional(),
  status: z.enum(["SUCCESS", "FAILED", "PENDING"]).optional(),
  sort: z.enum(["newest", "oldest", "amount_asc", "amount_desc"]).optional().default("newest"),
  from: z.string().optional(),
  to: z.string().optional(),
});
