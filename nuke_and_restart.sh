#!/bin/bash

# Kill EVERYTHING
echo "Nuclear option - killing all node/npm/vite processes..."
killall -9 npm 2>/dev/null || true
killall -9 node 2>/dev/null || true  
killall -9 vite 2>/dev/null || true
pkill -9 -f "node server.js" 2>/dev/null || true
pkill -9 -f "npm run dev" 2>/dev/null || true
pkill -9 -f "vite" 2>/dev/null || true

sleep 3

# Kill anything on ports 3000-3010
for port in 3000 3001 3002 3003 3004 3005; do
  fuser -k ${port}/tcp 2>/dev/null || true
done

sleep 2

echo "All processes killed. Starting fresh..."

# Clear logs
> /tmp/server.log
> /tmp/frontend.log

# Start backend
cd /home/maxx/Desktop/work/escro-platform/backend
echo "Backend starting on 5000..."
nohup node server.js > /tmp/server.log 2>&1 &
sleep 3

# Start frontend
cd /home/maxx/Desktop/work/escro-platform/frontend
echo "Frontend starting..."
nohup npm run dev > /tmp/frontend.log 2>&1 &
sleep 4

echo ""
echo "✓ Checking status..."
ps aux | grep -E "node server|npm run dev" | grep -v grep
echo ""
ss -tlnp 2>/dev/null | grep -E "5000|3001|3002|3003"
echo ""
echo "Access: http://localhost:3001 or http://localhost:3002 or http://localhost:3003"
echo "Logs: tail -f /tmp/server.log"
