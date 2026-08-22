import OpenAI from "openai";
import { z } from "zod";

import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "../models/transaction.js";

/* =========================================================
   TYPES
========================================================= */

export type RecoveryDecision = {
  decision: "RETRY_NOW" | "RETRY_LATER" | "DO_NOT_RETRY";

  delayMinutes: number;

  reasoning: string;

  action:
    | "RETRY_NOW"
    | "RETRY_LATER"
    | "SEND_REMINDER"
    | "CHANGE_PAYMENT_METHOD"
    | "ESCALATE"
    | "NO_ACTION";
};

/* =========================================================
   ZOD SCHEMAS
========================================================= */

const categoryResponseSchema = z.object({
  category: z.enum(TRANSACTION_CATEGORIES),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional(),
});

const recoveryDecisionSchema = z.object({
  decision: z.enum([
    "RETRY_NOW",
    "RETRY_LATER",
    "DO_NOT_RETRY",
  ]),

  delayMinutes: z
    .number()
    .nonnegative(),

  reasoning: z.string(),

  action: z.enum([
    "RETRY_NOW",
    "RETRY_LATER",
    "SEND_REMINDER",
    "CHANGE_PAYMENT_METHOD",
    "ESCALATE",
    "NO_ACTION",
  ]),
});

/* =========================================================
   AI CLIENT
========================================================= */

function getClient(): OpenAI | null {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

/* =========================================================
   AI CONFIGURATION
========================================================= */

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

function getModel(): string {
  return (
    process.env.AI_MODEL ||
    "openai/gpt-oss-20b"
  );
}

/* =========================================================
   TRANSACTION CATEGORIZATION
========================================================= */

export async function categorizeTransaction(
  description: string,
  amount: number
): Promise<TransactionCategory> {
  const client = getClient();

  if (!client || !description.trim()) {
    return "Other";
  }

  try {
    const completion =
      await client.chat.completions.create({
        model: getModel(),

        temperature: 0,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",

            content: `You classify personal finance transactions.

Return JSON only.

The category MUST be one of:

${TRANSACTION_CATEGORIES.join(", ")}

Required format:

{
  "category": "Food",
  "confidence": 0.95
}

If you are unsure, use "Other".`,
          },

          {
            role: "user",

            content:
              `Description: ${description}\nAmount: ₹${amount}`,
          },
        ],
      });

    const raw =
      completion.choices[0]?.message?.content ||
      "{}";

    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch {
      console.error(
        "AI categorization returned invalid JSON:",
        raw
      );

      return "Other";
    }

    const parsed =
      categoryResponseSchema.safeParse(json);

    if (!parsed.success) {
      console.error(
        "Invalid AI category response:",
        parsed.error.flatten()
      );

      return "Other";
    }

    return parsed.data.category;
  } catch (error) {
    console.error(
      "AI categorization failed:",
      error
    );

    return "Other";
  }
}

/* =========================================================
   FINANCE ASSISTANT
========================================================= */

export async function askFinanceAssistant(
  question: string,
  context: string
): Promise<string> {
  const client = getClient();

  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion =
    await client.chat.completions.create({
      model: getModel(),

      temperature: 0.2,

      messages: [
        {
          role: "system",

          content: `You are PayFlow AI, a personal finance assistant.

Answer ONLY using the provided transaction data.

Rules:

- Do not invent transaction amounts.
- Do not invent transaction history.
- If the data is insufficient, clearly say so.
- Use Indian Rupees (₹).
- Keep the answer concise.
- Do not provide legal or tax advice.`,
        },

        {
          role: "user",

          content:
            `Transaction data:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "I could not generate a response right now."
  );
}

/* =========================================================
   SPENDING INSIGHT
========================================================= */

export async function generateSpendingInsight(
  context: string
): Promise<string> {
  const client = getClient();

  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion =
    await client.chat.completions.create({
      model: getModel(),

      temperature: 0.3,

      messages: [
        {
          role: "system",

          content: `You write short PayFlow AI spending insights.

Use ONLY the provided statistics.

Include:

1. One concrete spending observation.
2. One practical suggestion.

Rules:

- Never invent numbers.
- Use ₹ formatting.
- Keep the response under 80 words.`,
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

/* =========================================================
   MONTHLY SUMMARY
========================================================= */

export async function generateMonthlySummary(
  context: string
): Promise<string> {
  const client = getClient();

  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion =
    await client.chat.completions.create({
      model: getModel(),

      temperature: 0.3,

      messages: [
        {
          role: "system",

          content: `Create a monthly financial summary for PayFlow.

Use ONLY the provided numbers.

Include:

- Income
- Expenses
- Top spending category
- Month-over-month change if available
- One practical recommendation

Rules:

- Never invent numbers.
- Use ₹ formatting.
- Keep the response under 120 words.`,
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

/* =========================================================
   AI PAYMENT RECOVERY DECISION
========================================================= */

export async function generateRecoveryDecision(
  context: string
): Promise<RecoveryDecision> {
  const client = getClient();

  if (!client) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const completion =
    await client.chat.completions.create({
      model: getModel(),

      temperature: 0.1,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",

          content: `
You are PayRescue, an AI payment recovery decision engine.

Your job is to recommend what should happen after a payment fails.

Use ONLY the provided payment, anomaly and ML information.

IMPORTANT:
You are a decision engine.
Do not invent information.

RULES:

1. If recovery probability >= 75 and the failure is temporary
   such as BANK_ERROR, NETWORK_ERROR or TIMEOUT:
   prefer RETRY_NOW.

2. If recovery probability >= 75 but the transaction is anomalous:
   choose RETRY_LATER.

3. If recovery probability is between 45 and 75:
   choose RETRY_LATER.

4. If recovery probability is below 45:
   choose DO_NOT_RETRY.

5. Never automatically retry INVALID_DETAILS.

6. Never automatically retry LIMIT_EXCEEDED.

7. If retry count is already high, avoid automatic retry.

8. Available decisions:

RETRY_NOW
RETRY_LATER
DO_NOT_RETRY

9. Available actions:

RETRY_NOW
RETRY_LATER
SEND_REMINDER
CHANGE_PAYMENT_METHOD
ESCALATE
NO_ACTION

10. delayMinutes must be a non-negative number.

Suggested delays:

RETRY_NOW -> 0
RETRY_LATER -> usually 30
DO_NOT_RETRY -> 0

Return JSON ONLY.

Example:

{
  "decision": "RETRY_LATER",
  "delayMinutes": 30,
  "reasoning": "The payment has a high recovery probability but should be retried after a short delay.",
  "action": "RETRY_LATER"
}
`,
        },

        {
          role: "user",

          content: context,
        },
      ],
    });

  const raw =
    completion.choices[0]?.message?.content ||
    "{}";

  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    console.error(
      "Recovery AI returned invalid JSON:",
      raw
    );

    throw new Error(
      "Invalid AI recovery decision"
    );
  }

  const parsed =
    recoveryDecisionSchema.safeParse(json);

  if (!parsed.success) {
    console.error(
      "Invalid recovery decision from AI:",
      parsed.error.flatten()
    );

    throw new Error(
      "Invalid AI recovery decision"
    );
  }

  return parsed.data;
}