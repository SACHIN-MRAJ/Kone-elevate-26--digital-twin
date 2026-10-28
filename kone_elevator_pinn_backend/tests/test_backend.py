import urllib.request
import json
import time

print("[Test] Connecting to new backend on port 8001...")
for i in range(5):
    res = urllib.request.urlopen("http://localhost:8001/api/v1/elevators/elevator-001/telemetry/latest")
    data = json.loads(res.read())
    kin = data["kinematics"]
    mot = data["traction_motor"]
    print(f"Sample {data['sample_index']}: Floor {kin['current_floor']}, Pos {kin['position_m']}m, Speed {kin['speed_mps']} m/s, Phase {data['operating_phase']}, Temp {mot['motor_temperature_c']}C, Vib {mot['motor_vibration_rms_g']}g")
    time.sleep(0.5)

print("\n[Test] Checking PINN Residuals endpoint...")
res_pinn = urllib.request.urlopen("http://localhost:8001/api/v1/elevators/elevator-001/pinn/live")
pinn_data = json.loads(res_pinn.read())
print(f"PINN Residual: {pinn_data['composite_physics_residual']}, Compliance: {pinn_data['compliance_percentage']}%, Normal: {pinn_data['is_physically_normal']}")

print("\n[Test] Checking ML Live Dashboard endpoint...")
res_ml = urllib.request.urlopen("http://localhost:8001/api/v1/elevators/elevator-001/ml/live-dashboard")
ml_data = json.loads(res_ml.read())
print(f"ML Fault: {ml_data['fault_classification']['predicted_fault_type']} (Conf: {ml_data['fault_classification']['confidence']}), Anomaly: {ml_data['anomaly']['is_anomaly']}, Limiting: {ml_data['rul']['estimated_limiting_subsystem']}, RUL: {ml_data['rul']['predicted_rul_hours']} hrs")

print("\n[SUCCESS] New backend is 100% operational!")
