#!/usr/bin/env python3
import subprocess
import time
import os

def run_cmd(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout"

# Kill existing processes
print("Killing existing processes...")
run_cmd("pkill -9 node")
run_cmd("pkill -9 vite")
time.sleep(1)

# Start backend
print("Starting backend...")
run_cmd("cd /home/maxx/Desktop/work/escro-platform/backend && nohup node server.js > /tmp/server.log 2>&1 &")
time.sleep(3)

# Start frontend
print("Starting frontend...")
run_cmd("cd /home/maxx/Desktop/work/escro-platform/frontend && nohup npm run dev > /tmp/frontend.log 2>&1 &")
time.sleep(3)

# Check if servers are running
code, out, err = run_cmd("pgrep -l node")
print(f"Node processes: {out}")

code, out, err = run_cmd("ss -tlnp 2>/dev/null | grep -E '5000|3001' || netstat -tlnp 2>/dev/null | grep -E '5000|3001'")
print(f"Listening ports:\n{out}")

print("\nServers started. Logs available at /tmp/server.log and /tmp/frontend.log")
