import { useState } from "react";
import { api } from "../lib/api";

type Analysis = {
  recoveryProbability: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | string;
  anomaly: boolean;
  anomalyReason?: string | null;
  customerSuccessRate?: number;
};

type RecoveryDecision = {
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

type RecoveryResult = {
  success: boolean;
  status: "RECOVERED" | "FAILED" | "ESCALATED" | string;
  recoveredAmount: number;
  retryCount: number;
  message?: string;
};

type FailedPayment = {
  transactionId: string;
  amount: number;
  paymentMethod: string;
  failureReason: string;
};

export function PayRescue() {
  const [transaction, setTransaction] =
    useState<FailedPayment | null>(null);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [decision, setDecision] =
    useState<RecoveryDecision | null>(null);

  const [recovery, setRecovery] =
    useState<RecoveryResult | null>(null);

  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);

  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * CREATE NEW FAILED PAYMENT
   * ---------------------------------------------------------
   */

  async function createFailedPayment() {
    try {
      setCreating(true);
      setError("");

      // Clear previous PayRescue session
      setTransaction(null);
      setAnalysis(null);
      setDecision(null);
      setRecovery(null);

      const response = await api.post(
        "/api/v1/ai/demo/failed-payment",
        {
          amount: 4999,
          paymentMethod: "UPI",
          failureReason: "BANK_ERROR",
          description: "PayRescue AI demo payment",
        }
      );

      const created =
        response.data.transaction;

      setTransaction({
        transactionId: response.data.transactionId,
        amount: created.amount,
        paymentMethod: created.paymentMethod,
        failureReason: created.failureReason,
      });
    } catch (err: any) {
      console.error(
        "Failed payment creation error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to create failed payment"
      );
    } finally {
      setCreating(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * ANALYZE PAYMENT
   * ---------------------------------------------------------
   */

  async function analyzePayment() {
    if (!transaction) {
      setError("Create a failed payment first.");
      return;
    }

    try {
      setAnalyzing(true);
      setError("");
      setAnalysis(null);
      setDecision(null);
      setRecovery(null);

      /*
       * Step 1:
       * Python ML analyzes recovery probability.
       */

      const analysisResponse = await api.post(
        "/api/v1/ai/analyze-payment",
        {
          transactionId:
            transaction.transactionId,
        }
      );

      setAnalysis(
        analysisResponse.data.analysis
      );

      /*
       * Step 2:
       * Groq AI + recovery policy decide what
       * should happen.
       */

      const decisionResponse = await api.post(
        "/api/v1/ai/recovery-decision",
        {
          transactionId:
            transaction.transactionId,
        }
      );

      /*
       * Your backend now returns finalDecision
       * after the deterministic recovery policy.
       *
       * Use finalDecision instead of blindly
       * trusting the LLM decision.
       */

      setDecision(
        decisionResponse.data.finalDecision ||
          decisionResponse.data.aiDecision
      );
    } catch (err: any) {
      console.error(
        "Payment analysis error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to analyze payment"
      );
    } finally {
      setAnalyzing(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * EXECUTE RECOVERY
   * ---------------------------------------------------------
   */

  async function executeRecovery() {
    if (!transaction) {
      setError("No transaction selected.");
      return;
    }

    try {
      setExecuting(true);
      setError("");

      const response = await api.post(
        "/api/v1/ai/execute-recovery",
        {
          transactionId:
            transaction.transactionId,
        }
      );

      setRecovery(
        response.data.recovery
      );
    } catch (err: any) {
      console.error(
        "Recovery execution error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Recovery execution failed"
      );
    } finally {
      setExecuting(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * RESET
   * ---------------------------------------------------------
   */

  function resetDemo() {
    setTransaction(null);
    setAnalysis(null);
    setDecision(null);
    setRecovery(null);
    setError("");
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            🤖 PayRescue AI
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            AI-powered payment recovery agent
          </p>
        </div>

        <div className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
          AI Agent
        </div>
      </div>

      {/* =====================================================
          CREATE PAYMENT
      ===================================================== */}

      {!transaction && (
        <div className="mt-6 rounded-xl bg-slate-50 p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm font-semibold text-slate-700">
                Demo Failed Payment
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create a realistic failed UPI payment
                and let PayRescue analyze it.
              </p>
            </div>

            <span className="text-xl font-bold text-slate-900">
              ₹4,999
            </span>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">
                Payment Method
              </p>

              <p className="mt-1 font-semibold">
                UPI
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">
                Failure Reason
              </p>

              <p className="mt-1 font-semibold">
                BANK_ERROR
              </p>
            </div>

          </div>

          <button
            onClick={createFailedPayment}
            disabled={creating}
            className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating
              ? "Creating Failed Payment..."
              : "Create Failed Payment"}
          </button>

        </div>
      )}

      {/* =====================================================
          TRANSACTION CREATED
      ===================================================== */}

      {transaction && (
        <div className="mt-6 rounded-xl bg-slate-50 p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Failed Payment
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                ₹{transaction.amount.toLocaleString("en-IN")}
              </p>
            </div>

            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              FAILED
            </span>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">
                Payment Method
              </p>

              <p className="mt-1 text-sm font-semibold">
                {transaction.paymentMethod}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">
                Failure Reason
              </p>

              <p className="mt-1 text-sm font-semibold">
                {transaction.failureReason}
              </p>
            </div>

          </div>

          <p className="mt-3 break-all text-xs text-slate-400">
            Transaction ID: {transaction.transactionId}
          </p>

          {!analysis && (
            <button
              onClick={analyzePayment}
              disabled={analyzing}
              className="mt-5 w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing
                ? "Analyzing with ML + AI..."
                : "Analyze with PayRescue AI"}
            </button>
          )}

        </div>
      )}

      {/* =====================================================
          ANALYSIS
      ===================================================== */}

      {analysis && (
        <div className="mt-6">

          <p className="mb-3 text-sm font-semibold text-slate-700">
            ML Payment Analysis
          </p>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Recovery Probability
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {analysis.recoveryProbability}%
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Risk Level
              </p>

              <p
                className={`mt-1 text-2xl font-bold ${
                  analysis.riskLevel === "LOW"
                    ? "text-green-600"
                    : analysis.riskLevel === "MEDIUM"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {analysis.riskLevel}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Anomaly
              </p>

              <p className="mt-1 text-lg font-bold">
                {analysis.anomaly
                  ? "⚠️ Detected"
                  : "✓ Normal"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Customer Success
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {analysis.customerSuccessRate ?? 0}%
              </p>
            </div>

          </div>

          {analysis.anomaly &&
            analysis.anomalyReason && (
              <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                ⚠️ {analysis.anomalyReason}
              </div>
            )}

        </div>
      )}

      {/* =====================================================
          AI DECISION
      ===================================================== */}

      {decision && (
        <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                Final Recovery Decision
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {decision.decision}
              </p>
            </div>

            <div className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-purple-700">
              {decision.delayMinutes > 0
                ? `${decision.delayMinutes} min`
                : "Immediate"}
            </div>

          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">
              Agent Action
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {decision.action}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">
              Decision Reasoning
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {decision.reasoning}
            </p>
          </div>

          {/* Execute only if recovery is allowed */}

          {(decision.decision === "RETRY_NOW" ||
            decision.decision === "RETRY_LATER") &&
            !recovery && (
              <button
                onClick={executeRecovery}
                disabled={executing}
                className="mt-5 w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {executing
                  ? "Recovery Agent Working..."
                  : "Execute Recovery Action"}
              </button>
            )}

          {decision.decision === "DO_NOT_RETRY" &&
            !recovery && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Automatic recovery is not recommended
                for this payment.
              </div>
            )}

        </div>
      )}

      {/* =====================================================
          RECOVERY RESULT
      ===================================================== */}

      {recovery && (
        <div
          className={`mt-6 rounded-xl p-5 ${
            recovery.success
              ? "border border-green-200 bg-green-50"
              : "border border-red-200 bg-red-50"
          }`}
        >

          <p className="text-sm font-semibold">
            Recovery Agent Result
          </p>

          <p className="mt-2 text-2xl font-bold">
            {recovery.success
              ? "✅ PAYMENT RECOVERED"
              : recovery.status === "ESCALATED"
              ? "⚠️ PAYMENT ESCALATED"
              : "❌ RECOVERY FAILED"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">

            <div>
              <p className="text-xs text-slate-500">
                Status
              </p>

              <p className="font-semibold">
                {recovery.status}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Recovered Amount
              </p>

              <p className="font-semibold">
                ₹{recovery.recoveredAmount.toLocaleString("en-IN")}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Retry Count
              </p>

              <p className="font-semibold">
                {recovery.retryCount}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          RESET / NEW PAYMENT
      ===================================================== */}

      {transaction && (
        <button
          onClick={resetDemo}
          disabled={creating || analyzing || executing}
          className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Create Another Failed Payment
        </button>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

    </div>
  );
}