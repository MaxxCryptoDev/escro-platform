#!/bin/bash

echo "Killing existing node processes..."
pkill -9 node 2>/dev/null
pkill -9 vite 2>/dev/null
sleep 1

echo "Starting backend..."
cd /home/maxx/Desktop/work/escro-platform/backend
node server.js > /tmp/server.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 2

echo "Starting frontend..."
cd /home/maxx/Desktop/work/escro-platform/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

sleep 2

echo "Checking ports..."
netstat -tlnp 2>/dev/null | grep -E "5000|3001" || ss -tlnp 2>/dev/null | grep -E "5000|3001"

echo "Done. Servers should be running."
echo "Backend log: tail -f /tmp/server.log"
echo "Frontend log: tail -f /tmp/frontend.log"
