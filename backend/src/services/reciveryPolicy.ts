 import type { RecoveryDecision } from "./ai.js";

/*
|--------------------------------------------------------------------------
| Recovery Policy
|--------------------------------------------------------------------------
|
| The AI is allowed to PROPOSE a recovery action.
| This policy is the final safety layer before the recovery agent executes it.
|
| Flow:
|
| ML prediction
|      ↓
| Groq AI decision
|      ↓
| validateRecoveryDecision()
|      ↓
| Recovery Agent
|
|--------------------------------------------------------------------------
*/

const TEMPORARY_FAILURES = new Set([
  "BANK_ERROR",
  "NETWORK_ERROR",
  "TIMEOUT",
]);

const NEVER_AUTO_RETRY = new Set([
  "INVALID_DETAILS",
  "LIMIT_EXCEEDED",
]);

const MAX_AUTO_RETRIES = 3;

const HIGH_RECOVERY_THRESHOLD = 75;

const MEDIUM_RECOVERY_THRESHOLD = 45;

const DEFAULT_RETRY_DELAY_MINUTES = 30;

/*
|--------------------------------------------------------------------------
| Helper: Safe decision builder
|--------------------------------------------------------------------------
*/

function buildDecision(
  decision: RecoveryDecision["decision"],
  delayMinutes: number,
  reasoning: string,
  action: RecoveryDecision["action"]
): RecoveryDecision {
  return {
    decision,
    delayMinutes,
    reasoning,
    action,
  };
}

/*
|--------------------------------------------------------------------------
| Validate AI Recovery Decision
|--------------------------------------------------------------------------
*/

export function validateRecoveryDecision(
  decision: RecoveryDecision,
  recoveryProbability: number,
  failureReason: string,
  isAnomaly: boolean,
  retryCount: number
): RecoveryDecision {

  /*
  |--------------------------------------------------------------------------
  | 1. Sanitize recovery probability
  |--------------------------------------------------------------------------
  */

  const probability = Math.max(
    0,
    Math.min(100, Number(recoveryProbability) || 0)
  );

  /*
  |--------------------------------------------------------------------------
  | 2. Never allow unlimited automatic retries
  |--------------------------------------------------------------------------
  */

  if (retryCount >= MAX_AUTO_RETRIES) {
    return buildDecision(
      "DO_NOT_RETRY",
      0,
      "Maximum automatic retry limit has been reached. Manual intervention is required.",
      "ESCALATE"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 3. Never automatically retry invalid payment details
  |--------------------------------------------------------------------------
  */

  if (failureReason === "INVALID_DETAILS") {
    return buildDecision(
      "DO_NOT_RETRY",
      0,
      "Automatic retry is disabled because the payment details appear to be invalid.",
      "NO_ACTION"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 4. Never automatically retry exceeded limits
  |--------------------------------------------------------------------------
  */

  if (failureReason === "LIMIT_EXCEEDED") {
    return buildDecision(
      "DO_NOT_RETRY",
      0,
      "Automatic retry is disabled because the payment limit has been exceeded. A different payment method may be required.",
      "CHANGE_PAYMENT_METHOD"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 5. Anomalous transactions require extra caution
  |--------------------------------------------------------------------------
  |
  | Even if ML predicts high recovery probability, don't immediately
  | retry an anomalous transaction.
  |
  */

  if (
    isAnomaly &&
    probability >= HIGH_RECOVERY_THRESHOLD
  ) {
    return buildDecision(
      "RETRY_LATER",
      DEFAULT_RETRY_DELAY_MINUTES,
      `Recovery probability is ${probability}%, but the transaction was flagged as anomalous. A delayed retry is safer.`,
      "RETRY_LATER"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 6. High probability + temporary failure
  |--------------------------------------------------------------------------
  |
  | Examples:
  |
  | BANK_ERROR
  | NETWORK_ERROR
  | TIMEOUT
  |
  */

  if (
    probability >= HIGH_RECOVERY_THRESHOLD &&
    TEMPORARY_FAILURES.has(failureReason)
  ) {

    /*
    | Don't blindly trust the AI.
    | The policy decides the final action.
    */

    return buildDecision(
      "RETRY_NOW",
      0,
      `Recovery probability is ${probability}% and the failure reason (${failureReason}) appears temporary. Immediate retry is allowed.`,
      "RETRY_NOW"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 7. High probability but non-temporary failure
  |--------------------------------------------------------------------------
  |
  | Example:
  | INSUFFICIENT_FUNDS
  |
  | Don't immediately retry just because the ML score is high.
  |
  */

  if (
    probability >= HIGH_RECOVERY_THRESHOLD
  ) {
    return buildDecision(
      "RETRY_LATER",
      DEFAULT_RETRY_DELAY_MINUTES,
      `Recovery probability is ${probability}%, but the failure reason (${failureReason}) does not qualify for an immediate retry.`,
      "RETRY_LATER"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 8. Medium recovery probability
  |--------------------------------------------------------------------------
  */

  if (
    probability >= MEDIUM_RECOVERY_THRESHOLD
  ) {
    return buildDecision(
      "RETRY_LATER",
      DEFAULT_RETRY_DELAY_MINUTES,
      `Recovery probability is ${probability}%. A delayed retry is preferred to an immediate retry.`,
      "RETRY_LATER"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 9. Low recovery probability
  |--------------------------------------------------------------------------
  */

  return buildDecision(
    "DO_NOT_RETRY",
    0,
    `Recovery probability is only ${probability}%, so automatic recovery is not recommended.`,
    "NO_ACTION"
  );
}

/*
|--------------------------------------------------------------------------
| Optional helper
|--------------------------------------------------------------------------
|
| Useful for debugging/testing the policy.
|--------------------------------------------------------------------------
*/

export function isTemporaryFailure(
  failureReason: string
): boolean {
  return TEMPORARY_FAILURES.has(
    failureReason
  );
}

/*
|--------------------------------------------------------------------------
| Optional helper
|--------------------------------------------------------------------------
*/

export function canAutomaticallyRetry(
  failureReason: string,
  retryCount: number
): boolean {

  if (retryCount >= MAX_AUTO_RETRIES) {
    return false;
  }

  if (NEVER_AUTO_RETRY.has(failureReason)) {
    return false;
  }

  return true;
}