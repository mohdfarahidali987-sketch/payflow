import OpenAI from "openai";
import { z } from "zod";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "../models/transaction.js";

const categoryResponseSchema = z.object({
  category: z.enum(TRANSACTION_CATEGORIES),
  confidence: z.number().min(0).max(1).optional(),
});

function getClient() {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

export async function categorizeTransaction(
  description: string,
  amount: number
): Promise<TransactionCategory> {
  const client = getClient();
  if (!client || !description.trim()) {
    return "Other";
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.1-8b-instant",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You classify personal finance transactions.
Return JSON only: {"category":"<one of ${TRANSACTION_CATEGORIES.join(", ")}","confidence":0-1}.
Pick the best matching category. If unsure, use Other.`,
        },
        {
          role: "user",
          content: `Description: ${description}\nAmount: ₹${amount}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = categoryResponseSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return "Other";
    }
    return parsed.data.category;
  } catch (error) {
    console.error("AI categorization failed:", error);
    return "Other";
  }
}

export async function askFinanceAssistant(
  question: string,
  context: string
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are PayFlow AI, a personal finance assistant.
Answer ONLY using the provided transaction data.
If the data is insufficient, say so clearly.
Be concise, use Indian Rupees (₹), and never invent amounts.
Do not give legal/tax advice.`,
      },
      {
        role: "user",
        content: `Transaction data:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "I could not generate a response right now."
  );
}

export async function generateSpendingInsight(context: string): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You write short PayFlow AI spending insights.
Use ONLY the provided stats. Mention one concrete observation and one practical suggestion.
Keep it under 80 words. Use ₹ formatting.`,
      },
      {
        role: "user",
        content: context,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "No insight available right now."
  );
}

export async function generateMonthlySummary(context: string): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `Create a monthly financial summary for PayFlow.
Use ONLY provided numbers. Include income, expenses, top category, month-over-month change if present, and one recommendation.
Keep it under 120 words.`,
      },
      {
        role: "user",
        content: context,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "No monthly summary available right now."
  );
}
