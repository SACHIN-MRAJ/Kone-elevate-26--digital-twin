"""End-to-End Model Training Pipeline for KONE Elevator Digital Twin.

Trains:
1. Physics-Informed Neural Network (PINN) - pinn_model.pt
2. 11-Class Multi-Fault Classifier - fault_classifier.joblib
3. Isolation Forest Anomaly Detector - anomaly_detector.joblib
4. Multi-Output Remaining Useful Life (RUL) Regressor - rul_regressor.joblib
"""

import os
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import torch
import torch.optim as optim
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor, IsolationForest
from sklearn.multioutput import MultiOutputRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, r2_score
import joblib

# Add parent directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.ml.pinn_model import ElevatorPINN, compute_pinn_loss

MODEL_DIR = BASE_DIR / "trained_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def generate_physical_dataset(n_samples_per_class: int = 4500) -> pd.DataFrame:
    """Generates synthetic physics-grounded telemetry for all 11 failure modes."""
    np.random.seed(42)
    classes = [
        "NORMAL",
        "MOTOR_DEGRADATION",
        "BEARING_DEGRADATION",
        "DOOR_MECHANISM_DEGRADATION",
        "BRAKE_DEGRADATION",
        "TRACTION_SLIP_PROBLEM",
        "OVERHEATING",
        "EXCESSIVE_VIBRATION",
        "DRIVE_CONTROLLER_FAULT",
        "SENSOR_DRIFT",
        "OVERLOAD",
    ]

    records = []
    print(f"[DataGen] Synthesizing {len(classes) * n_samples_per_class:,} physics-grounded telemetry frames...")

    for cls in classes:
        for _ in range(n_samples_per_class):
            # Baseline kinematics
            speed = np.random.uniform(0.0, 1.75)
            accel = np.random.uniform(-0.85, 0.85) if speed > 0.05 else 0.0
            payload = np.random.uniform(50.0, 1150.0)
            ambient = np.random.uniform(22.0, 34.0)

            # Nominal physical models
            total_mass = 820.0 + payload
            f_hoist = (total_mass - 1420.0) * (9.80665 + accel)
            base_torque = abs(f_hoist * 0.24) + 120.0
            base_power = (base_torque * (speed / 0.24) / 0.935) / 1000.0 if speed > 0.05 else 0.0
            base_current = (base_power * 1000.0) / (np.sqrt(3.0) * 400.0 * 0.88) if base_power > 0.05 else 2.1
            base_temp = ambient + 12.0 + (base_current ** 2) * 0.028
            base_vib = 0.025 + 0.030 * (speed / 1.75) + np.random.normal(0, 0.005)
            door_current = np.random.uniform(0.3, 0.6)

            # RUL baseline (hours)
            rul_motor = np.random.uniform(28000, 36000)
            rul_bearings = np.random.uniform(24000, 32000)
            rul_brake = np.random.uniform(16000, 22000)
            rul_ropes = np.random.uniform(36000, 48000)
            rul_door = np.random.uniform(14000, 20000)

            # Fault Perturbations
            if cls == "MOTOR_DEGRADATION":
                base_current += np.random.uniform(4.0, 9.0)
                base_temp += np.random.uniform(20.0, 35.0)
                rul_motor *= np.random.uniform(0.10, 0.35)
            elif cls == "BEARING_DEGRADATION":
                base_vib += np.random.uniform(0.40, 1.25)
                rul_bearings *= np.random.uniform(0.08, 0.25)
            elif cls == "DOOR_MECHANISM_DEGRADATION":
                door_current += np.random.uniform(1.2, 3.5)
                rul_door *= np.random.uniform(0.05, 0.20)
            elif cls == "BRAKE_DEGRADATION":
                base_torque += np.random.uniform(60.0, 180.0)
                rul_brake *= np.random.uniform(0.05, 0.25)
            elif cls == "TRACTION_SLIP_PROBLEM":
                base_torque += np.random.uniform(80.0, 220.0)
                rul_ropes *= np.random.uniform(0.15, 0.40)
            elif cls == "OVERHEATING":
                base_temp += np.random.uniform(42.0, 65.0)
                base_current += np.random.uniform(3.0, 7.0)
                rul_motor *= np.random.uniform(0.03, 0.15)
            elif cls == "EXCESSIVE_VIBRATION":
                base_vib += np.random.uniform(0.80, 1.60)
                rul_bearings *= np.random.uniform(0.04, 0.18)
            elif cls == "DRIVE_CONTROLLER_FAULT":
                base_current += np.random.uniform(6.0, 14.0)
                base_power += np.random.uniform(2.5, 6.0)
                rul_motor *= np.random.uniform(0.10, 0.30)
            elif cls == "SENSOR_DRIFT":
                base_temp += np.random.uniform(15.0, 25.0)
            elif cls == "OVERLOAD":
                payload = np.random.uniform(1280.0, 1650.0)
                base_torque *= 1.35
                base_power *= 1.35
                base_current *= 1.35

            records.append({
                "speed_mps": speed,
                "accel_mps2": accel,
                "payload_kg": payload,
                "temp_c": base_temp,
                "vibration_g": base_vib,
                "current_a": base_current,
                "power_kw": base_power,
                "efficiency_pct": max(86.0, min(96.0, 93.8 - (base_current / 30.0))),
                "door_current_a": door_current,
                "torque_nm": base_torque,
                "fault_class": cls,
                "rul_motor": max(20.0, rul_motor),
                "rul_bearings": max(20.0, rul_bearings),
                "rul_brake": max(20.0, rul_brake),
                "rul_ropes": max(20.0, rul_ropes),
                "rul_door": max(20.0, rul_door),
            })

    return pd.DataFrame(records)


def train_pinn_model():
    """Trains PyTorch Physics-Informed Neural Network."""
    print("\n[PINN Training] Generating 6,000 collocation points across operating domain...")
    np.random.seed(42)
    torch.manual_seed(42)

    v = np.random.uniform(-1.75, 1.75, (6000, 1))
    a = np.random.uniform(-0.85, 0.85, (6000, 1))
    payload = np.random.uniform(0.0, 1400.0, (6000, 1))
    temp = np.random.uniform(25.0, 95.0, (6000, 1))
    vib = np.random.uniform(0.02, 1.20, (6000, 1))
    h = np.random.uniform(0.0, 84.0, (6000, 1))

    x_data = np.hstack([v, a, payload, temp, vib, h])
    x_tensor = torch.tensor(x_data, dtype=torch.float32)

    model = ElevatorPINN(input_dim=6, hidden_dim=64, output_dim=4)
    optimizer = optim.Adam(model.parameters(), lr=0.002)

    print("[PINN Training] Optimizing physical loss (Torque + Energy + Thermal)...")
    for epoch in range(1, 351):
        optimizer.zero_grad()
        total_loss, loss_pde, loss_res = compute_pinn_loss(model, x_tensor)
        total_loss.backward()
        optimizer.step()

        if epoch % 70 == 0 or epoch == 1:
            print(f"  Epoch {epoch:3d}/350 | Total Loss: {total_loss.item():.4f} | PDE Loss: {loss_pde.item():.4f} | Res Loss: {loss_res.item():.4f}")

    pinn_path = MODEL_DIR / "pinn_model.pt"
    torch.save(model.state_dict(), str(pinn_path))
    print(f"[PINN Training] Finished! Model saved to {pinn_path}")


def train_ml_suite(df: pd.DataFrame):
    """Trains multi-class fault classifier, anomaly detector, and RUL regressors."""
    feature_cols = [
        "speed_mps", "accel_mps2", "payload_kg", "temp_c", "vibration_g",
        "current_a", "power_kw", "efficiency_pct", "door_current_a", "torque_nm"
    ]
    X = df[feature_cols].values
    y_class = df["fault_class"].values
    y_rul = df[["rul_motor", "rul_bearings", "rul_brake", "rul_ropes", "rul_door"]].values

    # 1. Fault Classifier
    print("\n[Classifier Training] Fitting Random Forest on 11 fault classes...")
    le = LabelEncoder()
    y_encoded = le.fit_transform(y_class)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    clf = RandomForestClassifier(n_estimators=120, max_depth=16, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[Classifier Training] Test Accuracy: {acc * 100:.2f}%")

    clf_bundle = {"model": clf, "label_encoder": le, "scaler": scaler, "features": feature_cols}
    clf_path = MODEL_DIR / "fault_classifier.joblib"
    joblib.dump(clf_bundle, str(clf_path))
    print(f"[Classifier Training] Saved to {clf_path}")

    # 2. Isolation Forest Anomaly Detector
    print("\n[Anomaly Detector] Training Isolation Forest on nominal operation baseline...")
    nominal_mask = (y_class == "NORMAL")
    X_nominal = X_scaled[nominal_mask]

    iso = IsolationForest(n_estimators=100, contamination=0.02, random_state=42, n_jobs=-1)
    iso.fit(X_nominal)

    iso_path = MODEL_DIR / "anomaly_detector.joblib"
    joblib.dump(iso, str(iso_path))
    print(f"[Anomaly Detector] Saved to {iso_path}")

    # 3. RUL Multi-Output Regressor
    print("\n[RUL Regressor] Fitting multi-output RUL Gradient Boosting models...")
    X_r_train, X_r_test, y_r_train, y_r_test = train_test_split(X_scaled, y_rul, test_size=0.2, random_state=42)
    rul_base = GradientBoostingRegressor(n_estimators=80, max_depth=5, random_state=42)
    rul_multi = MultiOutputRegressor(rul_base, n_jobs=-1)
    rul_multi.fit(X_r_train, y_r_train)

    y_r_pred = rul_multi.predict(X_r_test)
    r2 = r2_score(y_r_test, y_r_pred)
    print(f"[RUL Regressor] Mean R2 Score across components: {r2:.4f}")

    rul_path = MODEL_DIR / "rul_regressor.joblib"
    joblib.dump(rul_multi, str(rul_path))
    print(f"[RUL Regressor] Saved to {rul_path}")


if __name__ == "__main__":
    print("=" * 65)
    print("  KONE ELEVATOR DIGITAL TWIN — FULL MODEL TRAINING PIPELINE")
    print("=" * 65)
    train_pinn_model()
    data = generate_physical_dataset(n_samples_per_class=4500)
    train_ml_suite(data)
    print("\n[Complete] All models trained and exported successfully!")
