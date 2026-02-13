#!/bin/bash
# Kill existing processes
pkill -f "node server.js"
pkill -f "vite"

# Wait a moment
sleep 2

# Start Backend
nohup node server.js > backend.log 2>&1 &
echo "Backend started on port 3001 (PID $!)"

# Start Frontend
# explicit --host to bind to 0.0.0.0
# use --port 5173 --strictPort to force it or fail (avoid drifting to 5174)
nohup npm run dev -- --host --port 5173 --strictPort > frontend.log 2>&1 &
echo "Frontend started on port 5173 (PID $!)"

# Wait for startup
sleep 3

# Check status
if curl -s http://localhost:3001/api/files?path=workspace > /dev/null; then
  echo "✅ Backend API is UP"
else
  echo "❌ Backend API is DOWN"
  cat backend.log
fi

if curl -s http://localhost:5173/ > /dev/null; then
  echo "✅ Frontend is UP"
else
  echo "❌ Frontend is DOWN"
  cat frontend.log
fi
