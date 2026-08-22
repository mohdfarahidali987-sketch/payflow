import random
import pandas as pd

random.seed(42)

PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET"]

FAILURE_REASONS = [
    "INSUFFICIENT_FUNDS",
    "BANK_ERROR",
    "NETWORK_ERROR",
    "TIMEOUT",
    "LIMIT_EXCEEDED",
    "INVALID_DETAILS",
    "UNKNOWN",
]


def generate_recovery_outcome(
    amount,
    payment_method,
    failure_reason,
    retry_count,
    customer_success_rate,
    is_anomaly,
):
    """
    Generate a realistic synthetic recovery outcome.

    1 = payment recovered
    0 = payment not recovered
    """

    score = 0.0

    # Customer history is the strongest signal.
    score += customer_success_rate * 0.45

    # Lower retry count usually means better recovery chances.
    if retry_count == 0:
        score += 0.20
    elif retry_count == 1:
        score += 0.10
    elif retry_count == 2:
        score += 0.02
    else:
        score -= 0.12

    # Different failure types have different recovery characteristics.
    reason_scores = {
        "BANK_ERROR": 0.15,
        "NETWORK_ERROR": 0.13,
        "TIMEOUT": 0.12,
        "INSUFFICIENT_FUNDS": 0.04,
        "LIMIT_EXCEEDED": -0.04,
        "INVALID_DETAILS": -0.12,
        "UNKNOWN": 0.0,
    }

    score += reason_scores[failure_reason]

    # Some payment methods are more recoverable in our simulation.
    method_scores = {
        "UPI": 0.05,
        "CARD": 0.02,
        "NET_BANKING": 0.01,
        "WALLET": 0.04,
    }

    score += method_scores[payment_method]

    # Very large/anomalous payments are harder to recover.
    if is_anomaly:
        score -= 0.15

    if amount > 50000:
        score -= 0.08
    elif amount < 5000:
        score += 0.03

    # Add small randomness so the model doesn't learn a perfect rule.
    score += random.uniform(-0.08, 0.08)

    probability = max(0.02, min(0.98, score))

    return 1 if random.random() < probability else 0


rows = []

for _ in range(5000):
    amount = round(random.uniform(500, 100000), 2)

    payment_method = random.choice(PAYMENT_METHODS)

    failure_reason = random.choice(FAILURE_REASONS)

    retry_count = random.randint(0, 4)

    customer_success_rate = round(
        random.uniform(0.30, 0.98),
        2,
    )

    is_anomaly = random.choice([0, 0, 0, 0, 1])

    recovered = generate_recovery_outcome(
        amount=amount,
        payment_method=payment_method,
        failure_reason=failure_reason,
        retry_count=retry_count,
        customer_success_rate=customer_success_rate,
        is_anomaly=is_anomaly,
    )

    rows.append(
        {
            "amount": amount,
            "payment_method": payment_method,
            "failure_reason": failure_reason,
            "retry_count": retry_count,
            "customer_success_rate": customer_success_rate,
            "is_anomaly": is_anomaly,
            "recovered": recovered,
        }
    )


df = pd.DataFrame(rows)

df.to_csv("payment_recovery_dataset.csv", index=False)

print("Dataset generated successfully!")
print(f"Rows: {len(df)}")
print()
print(df.head())
print()
print("Recovery distribution:")
print(df["recovered"].value_counts())