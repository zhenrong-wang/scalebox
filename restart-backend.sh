#!/bin/bash

# Script to restart the Go backend service
echo "🔄 Restarting Backend Service..."

# Kill any existing process on port 8000
echo "🔍 Checking for existing processes on port 8000..."
BACKEND_PIDS=$(lsof -i :8000 | awk 'NR>1 {print $2}' 2>/dev/null)
if [ -n "$BACKEND_PIDS" ]; then
    echo "⚠️  Killing existing backend processes: $BACKEND_PIDS"
    echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null
    sleep 2
else
    echo "✅ No existing processes on port 8000"
fi

# Navigate to backend directory
echo "📁 Navigating to backend directory..."
cd /home/ubuntu/scalebox/go-backend || {
    echo "❌ Failed to navigate to backend directory"
    exit 1
}

# Check if main.go exists
if [ ! -f "cmd/main.go" ]; then
    echo "❌ cmd/main.go not found in $(pwd)"
    exit 1
fi

# Activate virtual environment if it exists (for memory)
if [ -f "/home/ubuntu/scalebox/.venv/bin/activate" ]; then
    echo "🐍 Activating Python virtual environment..."
    source /home/ubuntu/scalebox/.venv/bin/activate
fi

# Start the Go backend
echo "🚀 Starting Go backend server..."
echo "   Directory: $(pwd)"
echo "   Command: go run cmd/main.go"
echo "   Port: 8000"
echo ""

go run cmd/main.go &
BACKEND_PID=$!

# Wait a moment and check if it started successfully
sleep 3
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend started successfully (PID: $BACKEND_PID)"
    echo "🌐 Backend should be available at: http://localhost:8000"
    echo "🔍 Health check: curl http://localhost:8000/health"
else
    echo "❌ Backend failed to start"
    exit 1
fi 