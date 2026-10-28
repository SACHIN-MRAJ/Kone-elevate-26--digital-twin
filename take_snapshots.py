import subprocess
import time
import json
import urllib.request
import base64
import os
import socket

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9222
USER_DATA = r"C:\Users\sachi\AppData\Local\Temp\edge_cdp_profile"
ARTIFACTS_DIR = r"C:\Users\sachi\.gemini\antigravity\brain\c3212cd3-1a59-4b4d-9d15-55a9209089b4"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)

def make_ws_connection(ws_url):
    import urllib.parse
    parsed = urllib.parse.urlparse(ws_url)
    host = parsed.hostname
    port = parsed.port or 80
    path = parsed.path
    
    s = socket.create_connection((host, port), timeout=25)
    s.settimeout(25)
    key = base64.b64encode(os.urandom(16)).decode('utf-8')
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    resp = s.recv(4096).decode(errors='ignore')
    if "101 " not in resp:
        raise Exception(f"Handshake failed: {resp}")
    return s

def send_ws_frame(s, text):
    data = text.encode('utf-8')
    frame = bytearray()
    frame.append(0x81)
    length = len(data)
    mask = os.urandom(4)
    if length <= 125:
        frame.append(0x80 | length)
    elif length <= 65535:
        frame.append(0x80 | 126)
        frame.extend(length.to_bytes(2, 'big'))
    else:
        frame.append(0x80 | 127)
        frame.extend(length.to_bytes(8, 'big'))
    frame.extend(mask)
    for i in range(length):
        frame.append(data[i] ^ mask[i % 4])
    s.sendall(frame)

def recv_ws_frame(s):
    header = s.recv(2)
    if not header:
        return ""
    length = header[1] & 0x7F
    if length == 126:
        ext = s.recv(2)
        length = int.from_bytes(ext, 'big')
    elif length == 127:
        ext = s.recv(8)
        length = int.from_bytes(ext, 'big')
    
    payload = bytearray()
    while len(payload) < length:
        chunk = s.recv(min(length - len(payload), 65536))
        if not chunk:
            break
        payload.extend(chunk)
    return payload.decode('utf-8', errors='ignore')

def call_cdp(s, msg_id, method, params=None):
    msg = {"id": msg_id, "method": method, "params": params or {}}
    send_ws_frame(s, json.dumps(msg))
    while True:
        raw = recv_ws_frame(s)
        if not raw:
            break
        try:
            data = json.loads(raw)
            if data.get("id") == msg_id:
                return data
        except Exception:
            pass
    return None

def eval_js(s, msg_id, script):
    return call_cdp(s, msg_id, "Runtime.evaluate", {"expression": script, "returnByValue": True})

def capture_screenshot(s, msg_id, filepath):
    res = call_cdp(s, msg_id, "Page.captureScreenshot", {"format": "png"})
    if res and "result" in res and "data" in res["result"]:
        img_bytes = base64.b64decode(res["result"]["data"])
        with open(filepath, "wb") as f:
            f.write(img_bytes)
        print(f"[OK] Saved screenshot: {os.path.basename(filepath)}")
        return True
    return False

def main():
    cmd = [
        EDGE_PATH,
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={USER_DATA}",
        "--headless=new",
        "--disable-gpu",
        "--window-size=1600,1050",
        "http://127.0.0.1:8000/frontend/index.html"
    ]
    proc = subprocess.Popen(cmd)
    time.sleep(3)
    
    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")
        tabs = json.loads(req.read().decode())
        target = next((t for t in tabs if t.get("type") == "page" or "webSocketDebuggerUrl" in t), tabs[0])
        ws_url = target["webSocketDebuggerUrl"]
        s = make_ws_connection(ws_url)
        call_cdp(s, 1, "Page.enable")
        time.sleep(1)

        # 1. Dashboard Live
        print("1. Testing Dashboard...")
        eval_js(s, 10, "showPage('dashboard')")
        time.sleep(2)
        capture_screenshot(s, 11, os.path.join(ARTIFACTS_DIR, "final_dashboard_live.png"))

        # 2. Live Mission
        print("2. Testing Live Mission...")
        eval_js(s, 20, "showPage('mission')")
        time.sleep(2)
        capture_screenshot(s, 21, os.path.join(ARTIFACTS_DIR, "final_mission_live.png"))

        # 3. What-If Simulation - modify sliders
        print("3. Testing What-If Simulation...")
        eval_js(s, 30, "showPage('simulation'); selectWhatIfMotor('GEARLESS_PMSM'); onWhatIfSliderChange('power', 18.0); onWhatIfSliderChange('diameter', 460); onWhatIfSliderChange('load', 1100); if(window.renderWhatIfAll) window.renderWhatIfAll();")
        time.sleep(2.5)
        capture_screenshot(s, 31, os.path.join(ARTIFACTS_DIR, "final_whatif_interactive.png"))

        # 4. Technician AI
        print("4. Testing Technician AI...")
        eval_js(s, 40, "showPage('technician'); sendChat('Why is Elevator E-001 at risk and what is the root cause?');")
        time.sleep(3)
        capture_screenshot(s, 41, os.path.join(ARTIFACTS_DIR, "final_technician_advisor.png"))

        # 5. AI Diagnosis
        print("5. Testing AI Diagnosis...")
        eval_js(s, 50, "showPage('diagnosis')")
        time.sleep(2)
        capture_screenshot(s, 51, os.path.join(ARTIFACTS_DIR, "final_diagnosis_live.png"))

        # 6. Reports Dossier
        print("6. Testing Reports Dossier...")
        eval_js(s, 60, "showPage('reports-page')")
        time.sleep(2)
        capture_screenshot(s, 61, os.path.join(ARTIFACTS_DIR, "final_reports_live.png"))

        print("Finished all upgraded verification snapshots!")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
