import pandas as pd
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATASET_PATH = "payment_recovery_dataset.csv"
MODEL_PATH = "recovery_model.pkl"


df = pd.read_csv(DATASET_PATH)

X = df.drop("recovered", axis=1)
y = df["recovered"]


categorical_features = [
    "payment_method",
    "failure_reason",
]

numeric_features = [
    "amount",
    "retry_count",
    "customer_success_rate",
    "is_anomaly",
]


preprocessor = ColumnTransformer(
    transformers=[
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features,
        ),
        (
            "numeric",
            "passthrough",
            numeric_features,
        ),
    ]
)


model = RandomForestClassifier(
    n_estimators=250,
    max_depth=12,
    min_samples_leaf=4,
    random_state=42,
    class_weight="balanced",
)


pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model),
    ]
)


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)


print("Training model...")

pipeline.fit(X_train, y_train)


predictions = pipeline.predict(X_test)
probabilities = pipeline.predict_proba(X_test)[:, 1]


accuracy = accuracy_score(y_test, predictions)
auc = roc_auc_score(y_test, probabilities)


print()
print("========== MODEL RESULTS ==========")
print(f"Training samples : {len(X_train)}")
print(f"Testing samples  : {len(X_test)}")
print(f"Accuracy         : {accuracy:.4f}")
print(f"ROC-AUC          : {auc:.4f}")
print()
print("Classification Report:")
print(classification_report(y_test, predictions))


joblib.dump(pipeline, MODEL_PATH)

print()
print(f"Model saved successfully → {MODEL_PATH}")