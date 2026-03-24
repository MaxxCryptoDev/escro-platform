#!/usr/bin/env python3
import subprocess
import time
import sys

print("=== Restarting ESCRO Platform ===")

# Kill old processes
print("Killing old processes...")
subprocess.run("pkill -9 -f 'node server.js'", shell=True, capture_output=True)
subprocess.run("pkill -9 -f 'npm run dev'", shell=True, capture_output=True)
subprocess.run("pkill -9 node", shell=True, capture_output=True)
time.sleep(2)

# Clear logs
open('/tmp/server.log', 'w').close()
open('/tmp/frontend.log', 'w').close()

# Start backend
print("Starting backend...")
import os
os.chdir("/home/maxx/Desktop/work/escro-platform/backend")
subprocess.Popen(["nohup", "node", "server.js"], 
                 stdout=open('/tmp/server.log', 'a'), 
                 stderr=subprocess.STDOUT,
                 preexec_fn=os.setpgrp)
time.sleep(3)

# Start frontend
print("Starting frontend...")
os.chdir("/home/maxx/Desktop/work/escro-platform/frontend")
subprocess.Popen(["nohup", "npm", "run", "dev"],
                 stdout=open('/tmp/frontend.log', 'a'),
                 stderr=subprocess.STDOUT,
                 preexec_fn=os.setpgrp)
time.sleep(4)

# Check status
print("\n✓ Servers should be running:")
print("  Backend: http://localhost:5000")
print("  Frontend: http://localhost:3001")
print("  Tester: http://localhost:3001/api-tester.html")

print("\nLogs:")
print("  tail -f /tmp/server.log")
print("  tail -f /tmp/frontend.log")

sys.exit(0)
