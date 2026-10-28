import subprocess
import time
import json
import urllib.request
import urllib.parse
import base64
import os
import socket

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9222
USER_DATA = r"C:\Users\sachi\AppData\Local\Temp\edge_cdp_profile"
ARTIFACTS_DIR = r"C:\Users\sachi\.gemini\antigravity\brain\c3212cd3-1a59-4b4d-9d15-55a9209089b4"

p = subprocess.Popen([
    EDGE_PATH,
    f"--remote-debugging-port={PORT}",
    f"--user-data-dir={USER_DATA}",
    "--no-first-run",
    "--no-default-browser-check",
    "--headless=new",
    "--window-size=1600,1050",
    "http://localhost:8000/frontend/index.html"
])
time.sleep(3)

try:
    tabs = json.loads(urllib.request.urlopen(f"http://localhost:{PORT}/json").read().decode())
    target = tabs[0]
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
    
    def send_cmd(cmd_id, method, params=None):
        msg = json.dumps({"id": cmd_id, "method": method, "params": params or {}})
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
                if res.get("id") == cmd_id:
                    return res
            except:
                pass

    time.sleep(2)
    
    # 1. Navigate to What-If simulation page
    send_cmd(1, "Runtime.evaluate", {"expression": "window.showPage('simulation'); if(window.renderWhatIfAll) window.renderWhatIfAll();"})
    time.sleep(1.5)
    
    res = send_cmd(2, "Page.captureScreenshot", {"format": "png"})
    if res and "result" in res and "data" in res["result"]:
        out_path = os.path.join(ARTIFACTS_DIR, "whatif_simulation_view.png")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(res["result"]["data"]))
        print("Captured whatif_simulation_view.png")

    # 2. Select Geared Induction and adjust load
    send_cmd(3, "Runtime.evaluate", {"expression": "window.selectWhatIfMotor('GEARED_INDUCTION'); window.onWhatIfSliderChange('load', 1200);"})
    time.sleep(1)
    res2 = send_cmd(4, "Page.captureScreenshot", {"format": "png"})
    if res2 and "result" in res2 and "data" in res2["result"]:
        out_path2 = os.path.join(ARTIFACTS_DIR, "whatif_geared_induction_view.png")
        with open(out_path2, "wb") as f:
            f.write(base64.b64decode(res2["result"]["data"]))
        print("Captured whatif_geared_induction_view.png")

    # 3. Navigate to Live Mission
    send_cmd(5, "Runtime.evaluate", {"expression": "window.showPage('mission');"})
    time.sleep(1.5)
    res3 = send_cmd(6, "Page.captureScreenshot", {"format": "png"})
    if res3 and "result" in res3 and "data" in res3["result"]:
        out_path3 = os.path.join(ARTIFACTS_DIR, "live_mission_stochastic_view.png")
        with open(out_path3, "wb") as f:
            f.write(base64.b64decode(res3["result"]["data"]))
        print("Captured live_mission_stochastic_view.png")

    s.close()
finally:
    p.kill()
