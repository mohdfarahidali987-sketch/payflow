from flask import Flask, request, jsonify
import joblib
import pandas as pd
import os

app = Flask(__name__)

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "recovery_model.pkl"
)

model = joblib.load(MODEL_PATH)


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "PayRescue ML Engine"
    })


@app.post("/predict")
def predict():
    data = request.get_json()

    required_fields = [
        "amount",
        "payment_method",
        "failure_reason",
        "retry_count",
        "customer_success_rate",
        "is_anomaly",
    ]

    missing_fields = [
        field for field in required_fields
        if field not in data
    ]

    if missing_fields:
        return jsonify({
            "error": "Missing required fields",
            "fields": missing_fields
        }), 400

    try:
        input_data = pd.DataFrame([{
            "amount": float(data["amount"]),
            "payment_method": data["payment_method"],
            "failure_reason": data["failure_reason"],
            "retry_count": int(data["retry_count"]),
            "customer_success_rate": float(
                data["customer_success_rate"]
            ),
            "is_anomaly": int(data["is_anomaly"]),
        }])

        probability = model.predict_proba(input_data)[0][1]

        probability_percent = round(
            probability * 100,
            2
        )

        if probability_percent >= 75:
            risk_level = "LOW"
        elif probability_percent >= 45:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        return jsonify({
            "recovery_probability": probability_percent,
            "risk_level": risk_level
        })

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )