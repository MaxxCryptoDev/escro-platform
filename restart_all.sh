#!/bin/bash
# Ultimate server restart script - uses nohup to ensure background execution

echo "=== ESCRO Platform Server Restart ==="
echo "Time: $(date)"

# Kill existing processes - aggressive
pkill -9 -f "node server.js" 2>/dev/null || true
pkill -9 -f "npm run dev" 2>/dev/null || true
pkill -9 node 2>/dev/null || true
sleep 2

# Clear logs
> /tmp/server.log
> /tmp/frontend.log

# Start backend
echo "Starting backend on port 5000..."
cd /home/maxx/Desktop/work/escro-platform/backend
nohup node server.js >>  /tmp/server.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# Start frontend  
echo "Starting frontend on port 3001..."
cd /home/maxx/Desktop/work/escro-platform/frontend
nohup npm run dev >> /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 4

# Verify
echo ""
echo "=== Server Status ==="
ps aux | grep -E "node server.js|npm run dev" | grep -v grep && echo "✓ Processes found" || echo "✗ No processes found"

echo ""
echo "=== Port Check ==="
(netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null) | grep -E "5000|3001" || echo "✗ Ports not listening"

echo ""
echo "=== Logs ==="
echo "Server log (last 5 lines):"
tail -5 /tmp/server.log
echo ""
echo "Frontend log (last 5 lines):"
tail -5 /tmp/frontend.log

echo ""
echo "✓ Done. Access http://localhost:3001"
