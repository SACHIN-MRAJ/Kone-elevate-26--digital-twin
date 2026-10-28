# KONE Elevate Intelligence — Elevator Digital Twin & PINN ML Platform

An advanced manufacturer-independent Digital Twin platform for high-speed commercial elevators (KONE MonoSpace 500 / EcoDisc MX10), combining real-time 3D simulation, Physics-Informed Neural Networks (PINN), multi-task ML diagnostics, and automated technician decision support.

---

## 🏗️ Architecture Overview

The system consists of two tightly integrated components:

1. **Frontend UI (`frontend/`)**:
   - High-fidelity interactive Digital Twin web dashboard built with HTML5, CSS3, Three.js, and Chart.js.
   - Live telemetry monitors, 3D shaft cutaway visualizer, interactive fault injection sliders, What-If simulation playground, and Technician AI advisor.
   - Dual-stack API connector (`frontend/backend-api.js`) communicating directly with the FastAPI backend at `http://127.0.0.1:8001`.

2. **Real PINN & ML Backend (`kone_elevator_pinn_backend/`)**:
   - **Autonomous 5 Hz Physics Loop**: Runs continuous kinematics (position, speed, jerk), thermal ODEs, and motor electromechanics in real time.
   - **Physics-Informed Neural Network (PINN)**: Computes physical conservation residuals (Hooke's rope tension, heat dissipation ODEs, energy conservation).
   - **11-Class Fault Classifier**: Random Forest / Gradient Boosted model detecting real-time degradations (Bearing Degradation, Overload, Drive Controller Fault, Motor Overheating, etc.).
   - **RUL Regressor & Anomaly Detector**: Multi-output Remaining Useful Life predictor for critical elevator subsystems.
   - **REST API Endpoints**: Full CRUD for incidents, direction control, abnormality injection, and interactive What-If forecasting.

---

## 🚀 Quick Start (One-Click Launch)

To start both the Backend (Port 8001) and Frontend (Port 8000) simultaneously:

```cmd
start_all.bat
```

Or double-click `start_all.bat` in the project root.

- **Frontend Application**: [http://127.0.0.1:8000/frontend/index.html](http://127.0.0.1:8000/frontend/index.html)
- **Interactive API Documentation**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

---

## 🛠️ Manual Launch

### 1. Launching Backend (Port 8001)
```cmd
cd kone_elevator_pinn_backend
venv\Scripts\activate.bat
venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001
```

### 2. Launching Frontend (Port 8000)
```cmd
cd "kone winners"
python -m http.server 8000
```
Open your browser to `http://127.0.0.1:8000/frontend/index.html`.

---

## 🧠 ML & PINN Model Manifest

| Model | Path | Format | Role |
| :--- | :--- | :--- | :--- |
| **Elevator PINN** | `trained_models/pinn_model.pt` | PyTorch | First-principles physics conservation validation |
| **Fault Classifier** | `trained_models/fault_classifier.joblib` | Scikit-Learn | 11-class real-time fault identification |
| **Anomaly Detector** | `trained_models/anomaly_detector.joblib` | Scikit-Learn | Isolation Forest unsupervised anomaly detector |
| **RUL Predictor** | `trained_models/rul_regressor.joblib` | Scikit-Learn | Component lifecycle & hours remaining prediction |
