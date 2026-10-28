"""Pydantic data schemas for KONE Elevator Digital Twin & PINN ML Platform."""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class OperatingPhase(str, Enum):
    IDLE = "IDLE"
    DOOR_OPENING = "DOOR_OPENING"
    PASSENGER_LOADING = "PASSENGER_LOADING"
    DOOR_CLOSING = "DOOR_CLOSING"
    ACCELERATION = "ACCELERATION"
    TRAVEL = "TRAVEL"
    DECELERATION = "DECELERATION"
    ARRIVAL = "ARRIVAL"


class Direction(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    STATIONARY = "STATIONARY"


class KinematicsState(BaseModel):
    current_floor: int = Field(default=0, description="Landing floor index (B2=-2, B1=-1, G=0, 1-25)")
    target_floor: Optional[int] = Field(default=None, description="Dispatched landing target")
    position_m: float = Field(default=0.0, description="Height from hoistway pit datum (m)")
    direction: Direction = Field(default=Direction.STATIONARY)
    speed_mps: float = Field(default=0.0, description="Linear cabin velocity (m/s)")
    acceleration_mps2: float = Field(default=0.0, description="Linear cabin acceleration (m/s2)")
    jerk_mps3: float = Field(default=0.0, description="Time derivative of acceleration (m/s3)")
    travel_time_s: float = Field(default=0.0, description="Cumulative trip run time (s)")
    car_load_kg: float = Field(default=380.0, description="Passenger payload (kg)")
    car_load_percent: float = Field(default=31.7, description="Payload percentage of 1200kg rated capacity")


class TractionMotorState(BaseModel):
    motor_torque_nm: float = Field(default=0.0, description="Electromagnetic shaft torque (N*m)")
    motor_power_kw: float = Field(default=0.0, description="Active electrical input power (kW)")
    motor_current_a: float = Field(default=0.0, description="Stator phase current RMS (A)")
    motor_voltage_v: float = Field(default=400.0, description="Inverter bus voltage RMS (V)")
    motor_temperature_c: float = Field(default=42.5, description="Stator winding temperature (deg C)")
    motor_vibration_rms_g: float = Field(default=0.045, description="Drive bearing vibration RMS (g)")
    motor_efficiency_pct: float = Field(default=93.5, description="Mechanical-to-electrical efficiency (%)")
    inverter_frequency_hz: float = Field(default=0.0, description="VFD drive output frequency (Hz)")
    motor_rpm: float = Field(default=0.0, description="Sheave rotational speed (RPM)")


class DriveControllerState(BaseModel):
    dc_bus_voltage_v: float = Field(default=565.0, description="DC link capacitor voltage (V)")
    inverter_temp_c: float = Field(default=38.0, description="IGBT heatsink temperature (deg C)")
    igbt_status: str = Field(default="HEALTHY", description="IGBT switching health status")
    drive_state: str = Field(default="STANDBY", description="RUNNING, STANDBY, FAULT")


class BrakeState(BaseModel):
    brake_state: str = Field(default="RELEASED", description="RELEASED or ENGAGED")
    brake_current_a: float = Field(default=1.8, description="Holding coil current (A)")
    pad_wear_pct: float = Field(default=14.2, description="Brake lining wear (%)")
    emergency_engaged: bool = Field(default=False)


class DoorSystemState(BaseModel):
    door_state: str = Field(default="CLOSED", description="CLOSED, OPENING, OPEN, CLOSING")
    door_position_percent: float = Field(default=0.0, description="0=Fully Closed, 100=Fully Open")
    door_motor_current_a: float = Field(default=0.4, description="Door operator current (A)")
    door_closing_force_n: float = Field(default=68.0, description="Closing kinetic force (N)")


class EnvironmentalState(BaseModel):
    ambient_temperature_c: float = Field(default=28.5)
    hoistway_humidity_pct: float = Field(default=55.0)


class TelemetryFrame(BaseModel):
    sample_index: int = Field(default=0)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    elevator_id: str = Field(default="elevator-001")
    operating_phase: OperatingPhase = Field(default=OperatingPhase.IDLE)
    kinematics: KinematicsState = Field(default_factory=KinematicsState)
    traction_motor: TractionMotorState = Field(default_factory=TractionMotorState)
    drive_controller: DriveControllerState = Field(default_factory=DriveControllerState)
    brake: BrakeState = Field(default_factory=BrakeState)
    door_system: DoorSystemState = Field(default_factory=DoorSystemState)
    environmental: EnvironmentalState = Field(default_factory=EnvironmentalState)


class PhysicsResiduals(BaseModel):
    composite_physics_residual: float = Field(default=0.018, description="Combined physics violation norm")
    motion_residual_nm: float = Field(default=4.2, description="Newton motion equation residual |T_m - J*alpha - F*r|")
    thermal_residual_deg: float = Field(default=0.3, description="Thermal ODE conservation residual")
    energy_residual_kw: float = Field(default=0.15, description="Power conservation residual |P_elec - T*w/eta|")
    rope_tension_kn: float = Field(default=11.2, description="Total suspension rope tension (kN)")
    rope_elongation_mm: float = Field(default=3.4, description="Elastic Hooke rope stretch (mm)")
    sheave_slip_ratio: float = Field(default=0.002, description="Traction contact slip ratio")
    is_physically_normal: bool = Field(default=True)
    compliance_percentage: float = Field(default=98.2)


class FaultClassification(BaseModel):
    predicted_fault_type: str = Field(default="NORMAL")
    confidence: float = Field(default=0.98)
    is_fault: bool = Field(default=False)
    severity_tier: str = Field(default="LOW")
    probabilities: Dict[str, float] = Field(default_factory=dict)


class AnomalyDetection(BaseModel):
    is_anomaly: bool = Field(default=False)
    anomaly_score: float = Field(default=0.035)
    confidence: float = Field(default=0.96)


class RULPrediction(BaseModel):
    predicted_rul_hours: float = Field(default=32400.0)
    predicted_rul_days: float = Field(default=1350.0)
    estimated_limiting_subsystem: str = Field(default="Traction Motor")
    component_rul_hours: Dict[str, float] = Field(default_factory=dict)


class ComponentHealthSummary(BaseModel):
    overall_health_index: float = Field(default=94.5)
    traction_motor_health: float = Field(default=96.0)
    bearings_health: float = Field(default=94.0)
    brake_pads_health: float = Field(default=95.5)
    suspension_ropes_health: float = Field(default=98.0)
    door_operator_health: float = Field(default=89.0)


class MLDashboardResponse(BaseModel):
    elevator_id: str = "elevator-001"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    fault_classification: FaultClassification = Field(default_factory=FaultClassification)
    anomaly: AnomalyDetection = Field(default_factory=AnomalyDetection)
    rul: RULPrediction = Field(default_factory=RULPrediction)
    health: ComponentHealthSummary = Field(default_factory=ComponentHealthSummary)


class AbnormalityInjectionRequest(BaseModel):
    extra_temp_c: float = Field(default=0.0, ge=0.0, le=80.0)
    extra_vibration_g: float = Field(default=0.0, ge=0.0, le=2.0)
    extra_current_a: float = Field(default=0.0, ge=0.0, le=25.0)
    extra_friction_nm: float = Field(default=0.0, ge=0.0, le=400.0)
    extra_door_friction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    fault_preset: Optional[str] = None
    severity: float = Field(default=0.5, ge=0.0, le=1.0)


class AbnormalityState(BaseModel):
    extra_temp_c: float = 0.0
    extra_vibration_g: float = 0.0
    extra_current_a: float = 0.0
    extra_friction_nm: float = 0.0
    extra_door_friction_pct: float = 0.0
    active_preset: Optional[str] = None
    severity: float = 0.0
    is_active: bool = False


class DirectionControlRequest(BaseModel):
    direction: str = Field(description="'UP', 'DOWN', 'STOP', 'BRAKE', 'AUTO'")
    target_floor: Optional[int] = None
    passenger_load_kg: Optional[float] = None


class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str = "MEDIUM"
    component: str = "TRACTION_DRIVE"


class Incident(BaseModel):
    id: str
    elevator_id: str = "elevator-001"
    title: str
    description: str
    severity: str
    component: str
    status: str = "OPEN"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
