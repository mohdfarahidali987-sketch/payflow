from flask import Flask, request, jsonify
import joblib
import pandas as pd
import os

app = Flask(__name__)

# =========================================================
# LOAD ML MODEL
# =========================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "recovery_model.pkl"
)

try:
    model = joblib.load(MODEL_PATH)
    print("✅ Recovery model loaded successfully")
except Exception as error:
    print(f"❌ Failed to load recovery model: {error}")
    raise


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "PayRescue ML Engine"
    })


# =========================================================
# PREDICTION
# =========================================================

@app.post("/predict")
def predict():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request body must be valid JSON"
        }), 400

    required_fields = [
        "amount",
        "payment_method",
        "failure_reason",
        "retry_count",
        "customer_success_rate",
        "is_anomaly",
    ]

    missing_fields = [
        field
        for field in required_fields
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

            "payment_method": str(
                data["payment_method"]
            ),

            "failure_reason": str(
                data["failure_reason"]
            ),

            "retry_count": int(
                data["retry_count"]
            ),

            "customer_success_rate": float(
                data["customer_success_rate"]
            ),

            "is_anomaly": int(
                data["is_anomaly"]
            ),
        }])

        # =================================================
        # MODEL PREDICTION
        # =================================================

        probability = model.predict_proba(
            input_data
        )[0][1]

        probability_percent = round(
            probability * 100,
            2
        )

        # =================================================
        # RISK LEVEL
        # =================================================

        if probability_percent >= 75:
            risk_level = "LOW"

        elif probability_percent >= 45:
            risk_level = "MEDIUM"

        else:
            risk_level = "HIGH"

        # =================================================
        # RESPONSE
        # =================================================

        return jsonify({
            "recovery_probability": probability_percent,
            "risk_level": risk_level
        })

    except Exception as error:

        print(
            f"❌ Prediction error: {error}"
        )

        return jsonify({
            "error": str(error)
        }), 500


# =========================================================
# LOCAL DEVELOPMENT
# =========================================================

if __name__ == "__main__":

    port = int(
        os.environ.get(
            "PORT",
            5001
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )