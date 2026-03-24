#!/bin/bash

echo "======================================"
echo "ESCRO Platform - Final Nuclear Restart"
echo "======================================"
echo ""

# Step 1: Kill EVERYTHING related to node
echo "[1/5] Killing all processes..."
killall -9 npm 2>/dev/null
killall -9 node 2>/dev/null
killall -9 vite 2>/dev/null
pkill -9 -f "node" 2>/dev/null
pkill -9 -f "npm" 2>/dev/null
sleep 3

# Step 2: Kill by port
echo "[2/5] Freeing ports..."
for port in 3000 3001 3002 3003 3004 3005 5000 5001; do
  fuser -k ${port}/tcp 2>/dev/null || lsof -ti:${port} | xargs kill -9 2>/dev/null || true
done
sleep 2

# Step 3: Verify ports are free
echo "[3/5] Verifying ports are free..."
if ss -tlnp 2>/dev/null | grep -E "3001|5000" > /dev/null; then
  echo "⚠️  Ports still in use! Trying harder..."
  killall -9 MainThread 2>/dev/null
  sleep 3
fi

# Step 4: Start backend
echo "[4/5] Starting backend on port 5000..."
cd /home/maxx/Desktop/work/escro-platform/backend
rm -f /tmp/server.log
nohup node server.js > /tmp/server.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
sleep 4

# Step 5: Start frontend  
echo "[5/5] Starting frontend on port 3001..."
cd /home/maxx/Desktop/work/escro-platform/frontend
rm -f /tmp/frontend.log
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
sleep 5

echo ""
echo "======================================"
echo "STATUS CHECK"
echo "======================================"
echo ""

echo "Processes:"
ps aux | grep -E "node server|npm run dev" | grep -v grep || echo "  (none)"

echo ""
echo "Listening ports:"
ss -tlnp 2>/dev/null | grep -E "5000|3001|3002|3003" || netstat -tlnp 2>/dev/null | grep -E "5000|3001|3002|3003" || echo "  (check manually)"

echo ""
echo "Backend log (last 3 lines):"
tail -3 /tmp/server.log || echo "  (no log yet)"

echo ""
echo "Frontend log (last 3 lines):"
tail -3 /tmp/frontend.log || echo "  (no log yet)"

echo ""
echo "======================================"
echo "✓ RESTART COMPLETE"
echo "======================================"
echo ""
echo "Access points:"
echo "  • Main app: http://localhost:3001"
echo "  • Alt port: http://localhost:3002 or :3003"
echo "  • API test: http://localhost:3001/api-tester.html"
echo "  • Backend: http://localhost:5000/api/health"
echo ""
echo "Monitor logs:"
echo "  • Backend:  tail -f /tmp/server.log"
echo "  • Frontend: tail -f /tmp/frontend.log"
echo ""
