"""Incident management service for KONE Elevator Digital Twin."""

from typing import List, Optional
from datetime import datetime
from app.models.schemas import Incident, IncidentCreate


class IncidentService:
    def __init__(self):
        self._incidents: List[Incident] = [
            Incident(
                id="INC-2026-0921",
                elevator_id="elevator-001",
                title="Door Operator Stator Current Micro-Drift",
                description="Door drive motor RMS current registered +18% above baseline (5.8 A vs 4.9 A nominal) on Floor 4 opening cycle.",
                severity="MEDIUM",
                component="DOOR_SYSTEM",
                status="OPEN",
                created_at="2026-09-24T18:14:00+05:30",
            ),
            Incident(
                id="INC-2026-0918",
                elevator_id="elevator-001",
                title="High-Frequency Bearing Harmonic Resonance",
                description="Minor acceleration peak at 142 Hz detected by guide shoe accelerometer during upward cruise.",
                severity="LOW",
                component="GUIDE_RAIL",
                status="IN_PROGRESS",
                created_at="2026-09-22T10:30:00+05:30",
            ),
            Incident(
                id="INC-2026-0912",
                elevator_id="elevator-001",
                title="Brake Lining Thermal Dissipation Cycle Verified",
                description="Electromechanical brake pad gap measured 0.82mm; safety circuit verified.",
                severity="LOW",
                component="BRAKE_ASSEMBLY",
                status="RESOLVED",
                created_at="2026-09-18T14:45:00+05:30",
            ),
        ]

    def list_incidents(self, elevator_id: str = "elevator-001") -> List[Incident]:
        return [inc for inc in self._incidents if inc.elevator_id == elevator_id]

    def create_incident(self, data: IncidentCreate, elevator_id: str = "elevator-001") -> Incident:
        new_inc = Incident(
            id=f"INC-{datetime.now().strftime('%Y-%m%d%H%M')}",
            elevator_id=elevator_id,
            title=data.title,
            description=data.description,
            severity=data.severity,
            component=data.component,
            status="OPEN",
            created_at=datetime.now().isoformat(),
        )
        self._incidents.insert(0, new_inc)
        return new_inc


incident_service = IncidentService()
