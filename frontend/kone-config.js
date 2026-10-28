/**
 * KONE Elevate Intelligence - Central Configuration & PINN Physics Parameters
 * Single Source of Truth for KPIs, PINN Equations, and Condition Verification.
 */
window.KONE_CONFIG = {
  // Top 6 KPI Cards
  kpis: [
    { title: "TRACTION TORQUE", value: "&approx; 1.33", unit: "kN&middot;m", sub: "Direct motor physics", gold: true },
    { title: "MOTOR POWER", value: "&approx; 8.84", unit: "kW", sub: "Energy &amp; mech calc", gold: false },
    { title: "PHYSICS RESIDUAL", value: "0.018", unit: "", sub: "&starf; Physics constraint verified", gold: true, isPinn: true },
    { title: "ROPE / TRACTION FORCE", value: "&approx; 5.9", unit: "kN", sub: "Motor &rarr; sheave &rarr; cabin", gold: false },
    { title: "MECHANICAL EFFICIENCY", value: "&approx; 90&ndash;94%", unit: "", sub: "Physical performance", gold: false },
    { title: "DYNAMIC LOAD / ACCEL", value: "0.18", unit: "m/s&sup2;", sub: "Governing motion eq", gold: false }
  ],

  // Hybrid Engine: Physics + ML Evidence (6 items)
  physicsEvidence: [
    { label: "ELECTRICAL POWER", formula: "P = V &times; I = 1322.4 W", note: "228 V &times; 5.8 A &middot; Measured P<sub>elec</sub>" },
    { label: "CURRENT LOSS", formula: "P<sub>loss</sub> = I&sup2;R = 134.6 W", note: "Estimated winding resistance" },
    { label: "VIBRATION RMS", formula: "RMS = 0.73 g", note: "Accelerometer window" },
    { label: "TEMPERATURE RISE", formula: "&Delta;T = +13&deg;C", note: "Compared with baseline" },
    { label: "TRACTION MOTOR TORQUE", formula: "T<sub>m</sub> = J<sub>eq</sub>&alpha; + (m<sub>w</sub> &minus; m<sub>c</sub>)gR + T<sub>loss</sub> &approx; 1.33 kN&middot;m", note: "Sheave dynamics &middot; J<sub>eq</sub>=4.2 &middot; &alpha;=0.38", gold: true },
    { label: "PHYSICS RESIDUAL (PINN)", formula: "R<sub>phys</sub> = M x&#776; + C x&#775; + Kx &minus; F = 0.018 &rarr; 0", note: "&#9733; 98.2% physics constraint verified", pinn: true }
  ],

  // PINN Digital Twin Physics Equations & Condition Matrix
  pinnDiagnosis: {
    status: {
      tractionTorque: { value: "&approx; 1.33 kN&middot;m", condition: "GOOD CONDITION", note: "T<sub>m</sub> dynamic balance verified &middot; Within normal torque limits" },
      mechanicalEfficiency: { value: "&approx; 91.8%", condition: "PERFECT CONDITION", note: "Optimal mechanical efficiency &middot; Target: 90%&ndash;94%" },
      physicsResidual: { value: "0.018 &rarr; 0", condition: "PERFECT CONDITION", note: "Governing equation compliance: 98.2% (Threshold &lt; 0.05)" },
      systemHealth: { value: "GOOD / OPERATIONAL", condition: "ADVISORY ACTIVE", note: "Drive &amp; cabin in perfect condition; door motor advisory (~6 days)" }
    },
    equations: [
      {
        id: 1,
        title: "1. TRACTION MOTOR TORQUE",
        equation: "T<sub>m</sub> = J<sub>eq</sub> &alpha; + (m<sub>w</sub> &minus; m<sub>c</sub>)gR + T<sub>loss</sub>",
        condition: "Good Condition",
        output: "&approx; 1.33 kN&middot;m (1,330 N&middot;m)",
        statusBadge: "Safe Operating Range",
        parameters: [
          { symbol: "T<sub>m</sub>", name: "Traction motor torque", unit: "N&middot;m", value: "1,330", highlight: true },
          { symbol: "J<sub>eq</sub>", name: "Equivalent rotational inertia", unit: "kg&middot;m&sup2;", value: "4.20" },
          { symbol: "&alpha;", name: "Traction sheave angular acceleration", unit: "rad/s&sup2;", value: "0.38" },
          { symbol: "m<sub>w</sub>", name: "Counterweight mass", unit: "kg", value: "1,000" },
          { symbol: "m<sub>c</sub>", name: "Elevator car/load mass", unit: "kg", value: "820" },
          { symbol: "g", name: "Gravitational acceleration (9.81)", unit: "m/s&sup2;", value: "9.81" },
          { symbol: "R", name: "Traction sheave radius", unit: "m", value: "0.32" },
          { symbol: "T<sub>loss</sub>", name: "Mechanical loss/friction torque", unit: "N&middot;m", value: "42.5" }
        ]
      },
      {
        id: 2,
        title: "2. MECHANICAL / TRACTION EFFICIENCY",
        equation: "&eta; = (P<sub>mech</sub> / P<sub>elec</sub>) &times; 100 = (T<sub>m</sub>&omega; / P<sub>elec</sub>) &times; 100 %",
        condition: "Perfect Condition",
        output: "&approx; 91.8% (Benchmark: 90%&ndash;94%)",
        statusBadge: "P_elec Validated",
        parameters: [
          { symbol: "&eta;", name: "Motor/traction efficiency", unit: "%", value: "91.8%", highlight: true },
          { symbol: "P<sub>mech</sub>", name: "Mechanical output power", unit: "W", value: "1,214 W" },
          { symbol: "P<sub>elec</sub>", name: "Measured electrical input power", unit: "W", value: "1,322.4 W" },
          { symbol: "T<sub>m</sub>", name: "Motor torque", unit: "N&middot;m", value: "1,330 N&middot;m" },
          { symbol: "&omega;", name: "Motor/traction-sheave angular velocity", unit: "rad/s", value: "4.75 rad/s" }
        ],
        footerNote: "<strong>Power Verification:</strong> Input: 1,322.4 W | Output: 1,214 W | Loss: 108.4 W. Mechanical efficiency is within high-performance target."
      },
      {
        id: 3,
        title: "3. PHYSICS RESIDUAL (PINN)",
        equation: "R<sub>phys</sub> = M x&#776; + C x&#775; + Kx &minus; F &rarr; 0",
        condition: "Perfect Condition",
        output: "0.018 (Threshold &lt; 0.05)",
        statusBadge: "PINN Constraint Met",
        parameters: [
          { symbol: "R<sub>phys</sub>", name: "Physics residual", unit: "&mdash;", value: "0.018", highlight: true },
          { symbol: "M", name: "Elevator mass matrix", unit: "&mdash;", value: "Diag[820, 1000]" },
          { symbol: "C", name: "Damping matrix", unit: "&mdash;", value: "C = 0.12" },
          { symbol: "K", name: "Stiffness matrix", unit: "&mdash;", value: "K = 4.8e5" },
          { symbol: "x", name: "Elevator state/displacement vector", unit: "&mdash;", value: "Floor 12 (36.0m)" },
          { symbol: "x&#775;", name: "Elevator velocity vector", unit: "&mdash;", value: "1.52 m/s" },
          { symbol: "x&#776;", name: "Elevator acceleration vector", unit: "&mdash;", value: "0.18 m/s&sup2;" },
          { symbol: "F", name: "Applied/excitation force vector", unit: "N", value: "5,900 N" }
        ]
      }
    ],
    verificationMatrix: [
      { subsystem: "Traction Motor Dynamics (T<sub>m</sub>)", observed: "1,330 N&middot;m", expected: "1,318 N&middot;m", residual: "+12 N&middot;m", tolerance: "&plusmn; 80 N&middot;m", status: "GOOD CONDITION", type: "good" },
      { subsystem: "Mechanical Efficiency (&eta;)", observed: "91.8%", expected: "92.1%", residual: "-0.3%", tolerance: "&ge; 90.0%", status: "PERFECT CONDITION", type: "perfect" },
      { subsystem: "Equations of Motion Residual (R<sub>phys</sub>)", observed: "0.018", expected: "0.000", residual: "0.018", tolerance: "&le; 0.050", status: "PERFECT CONDITION (PINN CONSTRAINED)", type: "pinn" },
      { subsystem: "Rope & Hoisting Tension Force (F)", observed: "5.90 kN", expected: "5.88 kN", residual: "+0.02 kN", tolerance: "&plusmn; 0.35 kN", status: "PERFECT CONDITION", type: "perfect" },
      { subsystem: "Vertical Cabin Acceleration (x&#776;)", observed: "0.18 m/s&sup2;", expected: "0.18 m/s&sup2;", residual: "0.00 m/s&sup2;", tolerance: "&plusmn; 0.05 m/s&sup2;", status: "PERFECT CONDITION", type: "perfect" },
      { subsystem: "Door Header Track Current Draw", observed: "5.8 A", expected: "4.9 A", residual: "+0.9 A (+18%)", tolerance: "&plusmn; 0.5 A", status: "ATTENTION: SCHEDULE INSPECTION (~6 DAYS)", type: "warn" }
    ]
  }
,

  // Digital Twin Simulation 10 Physics Parameters
  simulationParameters: [
    { id: 'temp', label: 'Motor Temperature', range: '25–100 °C', default: 48, unit: '°C', effects: 'Motor winding resistance, losses, available torque', visibleChange: 'Torque, current, power, acceleration' },
    { id: 'voltage', label: 'Motor Supply Voltage', range: '320–460 V', default: 400, unit: 'V', effects: 'Motor electrical operating point', visibleChange: 'Speed, torque, current, power' },
    { id: 'cabinMass', label: 'Motor Load / Cabin Mass', range: '300–1000 kg', default: 820, unit: 'kg', effects: 'Gravitational load and required traction torque', visibleChange: 'Torque, acceleration, power' },
    { id: 'friction', label: 'Mechanical Friction / T_loss', range: '0–300 N·m', default: 42.5, unit: 'N·m', effects: 'Direct mechanical resistance', visibleChange: 'Torque ↑, power ↑, acceleration response ↓' },
    { id: 'stiffness', label: 'Rope Stiffness (K)', range: '0.7–1.2 × nom', default: 1.0, unit: '×', effects: 'Rope elastic response', visibleChange: 'Vibration, settling, oscillation' },
    { id: 'damping', label: 'Rope Damping (C)', range: '0–1.5 × nom', default: 1.0, unit: '×', effects: 'Vibration dissipation', visibleChange: 'Vibration amplitude/decay' },
    { id: 'cwtMass', label: 'Counterweight Mass', range: '±10% nominal (900–1100 kg)', default: 1000, unit: 'kg', effects: 'Balance between car and counterweight', visibleChange: 'Required motor torque/power' },
    { id: 'inertia', label: 'Motor Inertia (J)', range: '0.8–1.2 × nom', default: 1.0, unit: '×', effects: 'Dynamic response to acceleration', visibleChange: 'Acceleration and torque transient' },
    { id: 'targetSpeed', label: 'Target Speed', range: '0.5–2.0 m/s', default: 1.52, unit: 'm/s', effects: 'Motion trajectory', visibleChange: 'RPM, acceleration, travel time' },
    { id: 'sensorNoise', label: 'Sensor Noise', range: '0–10%', default: 1.8, unit: '%', effects: 'Measurement uncertainty', visibleChange: 'PINN/data loss and residual' }
  ]
};
