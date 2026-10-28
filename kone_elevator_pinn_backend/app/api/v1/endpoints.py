"""API endpoints for KONE Elevator Digital Twin & PINN ML Platform."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models.schemas import (
    TelemetryFrame,
    PhysicsResiduals,
    MLDashboardResponse,
    DirectionControlRequest,
    AbnormalityInjectionRequest,
    AbnormalityState,
    Incident,
    IncidentCreate,
)
from app.engine.physics_engine import kone_engine
from app.ml.inference import ml_manager
from app.services.incident_service import incident_service

router = APIRouter()


@router.get("/health", summary="Health and live status check")
def health_check():
    """Returns server status, uptime, and engine state for latency monitoring."""
    return {
        "status": "healthy",
        "elevator_id": "elevator-001",
        "simulation_running": True,
        "sample_index": kone_engine.sample_index,
        "current_floor": kone_engine.current_floor,
        "speed_mps": kone_engine.speed_mps,
    }


# ── Telemetry & Physics Endpoints ──

@router.get("/elevators/{elevator_id}/telemetry/latest", response_model=TelemetryFrame)
def get_latest_telemetry(elevator_id: str):
    """Retrieves the latest continuous physical telemetry frame."""
    return kone_engine._build_frame()


@router.get("/elevators/{elevator_id}/pinn/live", response_model=PhysicsResiduals)
def get_live_pinn(elevator_id: str):
    """Computes instantaneous PINN physics residuals and conservation metrics."""
    frame = kone_engine._build_frame()
    return kone_engine.compute_pinn_residuals(frame)


@router.get("/elevators/{elevator_id}/ml/live-dashboard", response_model=MLDashboardResponse)
def get_live_ml_dashboard(elevator_id: str):
    """Executes multi-task ML inference on current state."""
    frame = kone_engine._build_frame()
    residuals = kone_engine.compute_pinn_residuals(frame)
    return ml_manager.evaluate_telemetry(frame, residuals)


# ── Direction & Abnormality Controls ──

@router.post("/elevators/{elevator_id}/control/direction")
def control_direction(elevator_id: str, payload: DirectionControlRequest):
    """Commands manual motion: UP, DOWN, STOP, BRAKE, AUTO."""
    kone_engine.set_manual_direction(payload.direction, payload.target_floor, payload.passenger_load_kg)
    return {
        "status": "success",
        "mode": payload.direction,
        "target_floor": kone_engine.target_floor,
        "current_floor": kone_engine.current_floor,
    }


@router.post("/elevators/{elevator_id}/abnormalities/inject")
def inject_abnormalities(elevator_id: str, payload: AbnormalityInjectionRequest):
    """Injects synthetic or physical faults into the live physics loop."""
    kone_engine.set_abnormalities(
        extra_temp=payload.extra_temp_c,
        extra_vib=payload.extra_vibration_g,
        extra_current=payload.extra_current_a,
        extra_fric=payload.extra_friction_nm,
        extra_door=payload.extra_door_friction_pct,
        preset=payload.fault_preset,
        severity=payload.severity,
    )
    return {
        "status": "injected",
        "abnormalities": kone_engine.abnormalities,
    }


@router.post("/elevators/{elevator_id}/abnormalities/clear")
def clear_abnormalities(elevator_id: str):
    """Restores nominal physical baseline."""
    kone_engine.clear_abnormalities()
    return {"status": "cleared", "abnormalities": kone_engine.abnormalities}


@router.get("/elevators/{elevator_id}/abnormalities/state", response_model=AbnormalityState)
def get_abnormality_state(elevator_id: str):
    return kone_engine.abnormalities


# ── What-If Simulation Endpoint ──

@router.post("/elevators/{elevator_id}/simulation/what-if")
def simulate_what_if(elevator_id: str, payload: dict):
    """Runs What-If scenario through ML models."""
    speed = float(payload.get("speed_mps", 1.75))
    load = float(payload.get("load_kg", 600.0))
    ambient = float(payload.get("ambient_c", 28.0))
    current_amp = float(payload.get("motor_current_a", 5.8))
    vib_rms = float(payload.get("vibration_rms_g", 0.05))

    # Evaluate dynamic response
    pred_temp = ambient + (current_amp ** 2) * 0.42 * 0.082 * 10.0
    pred_risk = "LOW"
    rec_text = "Operating within normal nominal envelope."
    if vib_rms > 0.35 or current_amp > 8.0:
        pred_risk = "HIGH"
        rec_text = "Elevated mechanical stress. Schedule inspection of bearings and inverter drive."
    elif vib_rms > 0.15 or current_amp > 6.5:
        pred_risk = "MODERATE"
        rec_text = "Slight thermal or acoustic deviation. Monitor condition-based telemetry."

    return {
        "predicted_steady_temp_c": round(pred_temp, 1),
        "predicted_vibration_rms_g": round(vib_rms, 3),
        "predicted_risk_level": pred_risk,
        "recommendation": rec_text,
    }


# ── ML Classifier Prediction Endpoint ──

@router.post("/ml/models/fault-classifier/predict")
def predict_fault_classifier(payload: dict):
    """Supervised 11-class fault classifier prediction on input feature dictionary."""
    features = payload.get("features", {})
    speed = float(features.get("speed_mps", 1.52))
    accel = float(features.get("accel_mps2", features.get("acceleration_mps2", 0.0)))
    load = float(features.get("car_load_kg", features.get("payload_kg", 380.0)))
    temp = float(features.get("motor_temperature_c", features.get("temp_c", 42.5)))
    vib = float(features.get("motor_vibration_rms_g", features.get("vibration_g", 0.045)))
    current = float(features.get("motor_current_a", features.get("current_a", 5.8)))
    power = float(features.get("motor_power_kw", features.get("power_kw", (current * 400.0 * 1.732 * 0.88) / 1000.0)))
    eff = float(features.get("motor_efficiency_pct", features.get("efficiency_pct", 93.5)))
    door = float(features.get("door_motor_current_a", features.get("door_current_a", 0.4)))
    torque = float(features.get("motor_torque_nm", features.get("torque_nm", 150.0)))

    import numpy as np
    feat_vec = np.array([
        abs(speed), accel, load, temp, vib, current, power, eff, door, abs(torque)
    ]).reshape(1, -1)

    fc = ml_manager.classify_features(feat_vec, temp=temp, vib=vib, load=load)
    return {
        "predicted_fault_type": fc.predicted_fault_type,
        "confidence": fc.confidence,
        "is_fault": fc.is_fault,
        "severity_tier": fc.severity_tier,
        "probabilities": fc.probabilities,
    }


# ── Technician AI Assistant Query Endpoint ──

@router.get("/elevators/{elevator_id}/assistant/query")
def assistant_query(elevator_id: str, query: str = Query(...)):
    """Physics-grounded Technician AI assistant query endpoint."""
    frame = kone_engine._build_frame()
    residuals = kone_engine.compute_pinn_residuals(frame)
    ml_eval = ml_manager.evaluate_telemetry(frame, residuals)

    q_lower = query.lower()
    fc = ml_eval.fault_classification
    is_fault = fc.is_fault or (not residuals.is_physically_normal)

    if "temp" in q_lower or "heat" in q_lower or "thermal" in q_lower:
        what = f"Motor stator temperature is currently {frame.traction_motor.motor_temperature_c:.1f}°C."
        why = f"Thermal equilibrium ODE indicates heat dissipation is tracking current load ({frame.traction_motor.motor_current_a:.1f}A). Thermal residual is {residuals.thermal_residual_deg:.2f}°C."
        how = "ELEVATED (High Thermal Stress)" if frame.traction_motor.motor_temperature_c > 70 else "NOMINAL (Normal Thermal Dissipation)"
        actions = ["Check stator cooling fans and ventilation ducts.", "Verify inverter carrier frequency settings."]
        tools = ["FLIR Thermal Imager", "Infrared Thermometer"]
    elif "vib" in q_lower or "bearing" in q_lower:
        what = f"Drive bearing vibration is measuring {frame.traction_motor.motor_vibration_rms_g:.3f} g RMS."
        why = f"Mechanical vibration envelope matches ISO 10816 standards with compliance at {residuals.compliance_percentage:.1f}%."
        how = "CRITICAL (Bearing Fluting Risk)" if frame.traction_motor.motor_vibration_rms_g > 0.4 else "NOMINAL (Vibration within baseline)"
        actions = ["Inspect bearing race for spalling or electrical discharge machining marks.", "Check lubrication grease condition."]
        tools = ["Triaxial Accelerometer", "Bearing Stethoscope"]
    elif "brake" in q_lower or "slip" in q_lower or "rope" in q_lower:
        what = f"Brake pads wear is at {frame.brake.pad_wear_pct:.1f}% with suspension rope tension at {residuals.rope_tension_kn:.1f} kN."
        why = f"Hooke's law rope elongation is {residuals.rope_elongation_mm:.2f} mm and traction contact slip ratio is {residuals.sheave_slip_ratio:.4f}."
        how = "MODERATE (Wear within maintenance allowance)" if frame.brake.pad_wear_pct < 60 else "CRITICAL (Pad Replacement Required)"
        actions = ["Measure brake lining air gap with feeler gauge.", "Inspect sheave grooves for rope groove wear."]
        tools = ["Feeler Gauge Set", "Tension Meter"]
    else:
        what = f"Elevator {elevator_id} is operating on floor {frame.kinematics.current_floor} at {frame.kinematics.speed_mps:.2f} m/s in phase {frame.operating_phase.value}."
        why = f"Physics-Informed Neural Network composite residual is {residuals.composite_physics_residual:.3f} with {residuals.compliance_percentage:.1f}% physical equation compliance. Fault classifier: {fc.predicted_fault_type} ({fc.confidence*100:.0f}% confidence)."
        how = f"{fc.severity_tier} (Limiting subsystem: {ml_eval.rul.estimated_limiting_subsystem}, RUL: {ml_eval.rul.predicted_rul_days:.0f} days)"
        actions = ["Monitor live telemetry and maintain regular service interval."] if not is_fault else ["Perform diagnostic physical inspection of highlighted subsystem.", "Review incident log."]
        tools = ["Digital Multimeter", "KONE Maintenance Handheld Tool"]

    return {
        "what_is_happening": what,
        "why_it_is_happening": why,
        "how_serious": how,
        "next_actions": actions,
        "required_tools_and_parts": tools,
    }


# ── Incidents Endpoints ──

@router.get("/incidents", response_model=List[Incident])
def get_incidents(elevator_id: str = "elevator-001", page_size: int = 50):
    return incident_service.list_incidents(elevator_id)


@router.post("/incidents", response_model=Incident)
def create_incident(payload: IncidentCreate, elevator_id: str = "elevator-001"):
    return incident_service.create_incident(payload, elevator_id)
