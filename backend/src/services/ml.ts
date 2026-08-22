import { z } from "zod";

interface MLRecoveryInput {
  amount: number;
  paymentMethod: string;
  failureReason: string;
  retryCount: number;
  customerSuccessRate: number;
  isAnomaly: boolean;
}

const mlResponseSchema = z.object({
  recovery_probability: z.number().min(0).max(100),
  risk_level: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export type MLRecoveryResponse = z.infer<typeof mlResponseSchema>;

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://localhost:5001";

const ML_TIMEOUT_MS = 5000;

export async function predictRecovery(
  input: MLRecoveryInput
): Promise<MLRecoveryResponse> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, ML_TIMEOUT_MS);

  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        amount: input.amount,
        payment_method: input.paymentMethod,
        failure_reason: input.failureReason,
        retry_count: input.retryCount,
        customer_success_rate: input.customerSuccessRate,
        is_anomaly: input.isAnomaly ? 1 : 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `ML service failed: ${response.status} ${errorText}`
      );
    }

    const raw = await response.json();

    const parsed = mlResponseSchema.safeParse(raw);

    if (!parsed.success) {
      console.error(
        "Invalid ML response:",
        parsed.error.flatten()
      );

      throw new Error("Invalid response received from ML service");
    }

    return parsed.data;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("ML service timeout");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}