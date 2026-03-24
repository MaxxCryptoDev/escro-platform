#!/usr/bin/env python3

import subprocess
import time
import os

# Kill all node/npm/vite processes
subprocess.run("killall -9 node npm vite 2>/dev/null", shell=True)
time.sleep(2)

os.chdir("/home/maxx/Desktop/work/escro-platform/backend")

# Start backend with nohup to detach
with open("/tmp/server.log", "w") as logfile:
    subprocess.Popen(
        ["node", "server.js"],
        stdout=logfile,
        stderr=logfile,
        preexec_fn=os.setsid  # Create new process group
    )

time.sleep(3)

os.chdir("/home/maxx/Desktop/work/escro-platform/frontend")

# Start frontend with npm run dev
with open("/tmp/frontend.log", "w") as logfile:
    subprocess.Popen(
        ["npm", "run", "dev"],
        stdout=logfile,
        stderr=logfile,
        preexec_fn=os.setsid
    )

time.sleep(3)

# Check results
result = subprocess.run("sleep 1 && netstat -tlnp 2>/dev/null | grep -E '5000|3001' || ss -tlnp 2>/dev/null | grep -E '5000|3001'", shell=True, capture_output=True, text=True)
print("Running servers:")
print(result.stdout or "None found")

print("\nDone. Servers should be running.")
