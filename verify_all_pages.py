import subprocess
import time
import json
import urllib.request
import urllib.parse
import base64
import os
import socket
import shutil

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9222
USER_DATA = r"C:\Users\sachi\AppData\Local\Temp\edge_clean_profile_" + str(int(time.time()))
ARTIFACTS_DIR = r"C:\Users\sachi\.gemini\antigravity\brain\c3212cd3-1a59-4b4d-9d15-55a9209089b4"

os.makedirs(ARTIFACTS_DIR, exist_ok=True)

p = subprocess.Popen([
    EDGE_PATH,
    f"--remote-debugging-port={PORT}",
    f"--user-data-dir={USER_DATA}",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-fre",
    "--disable-sync",
    "--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,Sync",
    "--guest",
    "--headless=new",
    "--window-size=1600,1050",
    "http://localhost:8000/frontend/index.html"
])
time.sleep(3.5)

try:
    tabs = json.loads(urllib.request.urlopen(f"http://localhost:{PORT}/json").read().decode())
    # find page target
    target = next((t for t in tabs if t.get("type") == "page" or "webSocketDebuggerUrl" in t), tabs[0])
    ws_url = target["webSocketDebuggerUrl"]
    
    parsed = urllib.parse.urlparse(ws_url)
    s = socket.create_connection((parsed.hostname, parsed.port), timeout=15)
    key = base64.b64encode(os.urandom(16)).decode("utf-8")
    req = (
        f"GET {parsed.path} HTTP/1.1\r\n"
        f"Host: {parsed.hostname}:{parsed.port}\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        f"Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(req.encode())
    s.recv(4096)
    
    cmd_counter = 1
    def send_cmd(method, params=None):
        global cmd_counter
        cid = cmd_counter
        cmd_counter += 1
        msg = json.dumps({"id": cid, "method": method, "params": params or {}})
        data = msg.encode("utf-8")
        frame = bytearray([0x81])
        if len(data) <= 125:
            frame.append(0x80 | len(data))
        elif len(data) <= 65535:
            frame.extend([0x80 | 126] + list(len(data).to_bytes(2, "big")))
        else:
            frame.extend([0x80 | 127] + list(len(data).to_bytes(8, "big")))
        mask = os.urandom(4)
        frame.extend(mask)
        frame.extend(bytes([data[i] ^ mask[i % 4] for i in range(len(data))]))
        s.sendall(frame)
        
        while True:
            hdr = s.recv(2)
            if not hdr:
                return None
            b2 = hdr[1]
            length = b2 & 0x7f
            if length == 126:
                length = int.from_bytes(s.recv(2), "big")
            elif length == 127:
                length = int.from_bytes(s.recv(8), "big")
            payload = bytearray()
            while len(payload) < length:
                chunk = s.recv(length - len(payload))
                if not chunk:
                    break
                payload.extend(chunk)
            try:
                res = json.loads(payload.decode("utf-8", errors="ignore"))
                if res.get("id") == cid:
                    return res
            except:
                pass

    def snap(name):
        res = send_cmd("Page.captureScreenshot", {"format": "png"})
        if res and "result" in res and "data" in res["result"]:
            out_path = os.path.join(ARTIFACTS_DIR, f"{name}.png")
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(res["result"]["data"]))
            print(f"Captured {name}.png ({len(res['result']['data'])} bytes)")

    # Navigate directly
    send_cmd("Page.navigate", {"url": "http://localhost:8000/frontend/index.html"})
    time.sleep(3)
    
    # 1. Dashboard
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('dashboard');"})
    time.sleep(1.5)
    snap("verified_dashboard_v2")

    # 2. Live Mission
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('mission');"})
    time.sleep(1.5)
    snap("verified_mission_v2")

    # 3. Simulation Controller
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('controller');"})
    time.sleep(1.5)
    snap("verified_controller_v2")

    # 4. What-If Simulation - modify slider dynamically
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('simulation'); window.onWhatIfSliderChange('power', 18.5); window.onWhatIfSliderChange('diameter', 440); window.onWhatIfSliderChange('load', 1150); if(window.renderWhatIfAll) window.renderWhatIfAll();"})
    time.sleep(2.0)
    snap("verified_whatif_slider_v2")

    # 5. Technician AI - ask a question
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('technician'); window.sendChat('Why is Elevator E-001 at risk and what is the root cause?');"})
    time.sleep(2.5)
    snap("verified_technician_ai_v2")

    # 6. AI Diagnosis
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('diagnosis');"})
    time.sleep(1.5)
    snap("verified_diagnosis_v2")

    # 7. Reports
    send_cmd("Runtime.evaluate", {"expression": "window.showPage('reports-page');"})
    time.sleep(1.5)
    snap("verified_reports_v2")

    s.close()
    print("All verification snapshots completed successfully!")
finally:
    p.kill()
    try:
        shutil.rmtree(USER_DATA, ignore_errors=True)
    except:
        pass
