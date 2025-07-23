#!/bin/bash

# ScaleBox - Restart All Services Script
# This script restarts both the frontend and backend services

set -e

echo "🔄 ScaleBox - Restarting All Services"
echo "======================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    if check_port $port; then
        echo "🛑 Stopping $service_name on port $port..."
        lsof -i :$port | awk 'NR>1 {print $2}' | xargs kill -9
        sleep 2
        if check_port $port; then
            echo "⚠️  Warning: $service_name may still be running on port $port"
        else
            echo "✅ $service_name stopped successfully"
        fi
    else
        echo "ℹ️  $service_name not running on port $port"
    fi
}

# Kill existing processes
echo "📋 Checking for existing processes..."
kill_port 8000 "Backend"
kill_port 3000 "Frontend"

echo ""
echo "🚀 Starting services..."

# Start backend
echo "🔧 Starting backend..."
cd /home/ubuntu/scalebox/back-end
source /home/ubuntu/scalebox/.venv/bin/activate
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend started successfully
if check_port 8000; then
    echo "✅ Backend started successfully (PID: $BACKEND_PID)"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend..."
cd /home/ubuntu/scalebox/front-end
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

# Check if frontend started successfully
if check_port 3000; then
    echo "✅ Frontend started successfully (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 All services restarted successfully!"
echo "======================================"
echo "📊 Service Status:"
echo "   Backend:  http://localhost:8000 (PID: $BACKEND_PID)"
echo "   Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /home/ubuntu/scalebox/back-end/backend.log"
echo "   Frontend: tail -f /home/ubuntu/scalebox/front-end/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   Backend:  kill $BACKEND_PID"
echo "   Frontend: kill $FRONTEND_PID" 