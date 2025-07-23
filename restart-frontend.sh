#!/bin/bash

# Script to restart the Next.js frontend service
echo "🔄 Restarting Frontend Service..."

# Kill any existing Next.js processes
echo "🔍 Checking for existing Next.js processes..."
NEXTJS_PIDS=$(ps aux | grep -E "(next|npm run dev)" | grep -v grep | awk '{print $2}' 2>/dev/null)
if [ -n "$NEXTJS_PIDS" ]; then
    echo "⚠️  Killing existing Next.js processes: $NEXTJS_PIDS"
    echo "$NEXTJS_PIDS" | xargs kill -9 2>/dev/null
    sleep 2
else
    echo "✅ No existing Next.js processes found"
fi

# Also kill any processes on common Next.js ports (3000-3010)
echo "🔍 Checking for processes on ports 3000-3010..."
for port in {3000..3010}; do
    PORT_PIDS=$(lsof -i :$port | awk 'NR>1 {print $2}' 2>/dev/null)
    if [ -n "$PORT_PIDS" ]; then
        echo "⚠️  Killing processes on port $port: $PORT_PIDS"
        echo "$PORT_PIDS" | xargs kill -9 2>/dev/null
    fi
done
sleep 2

# Navigate to frontend directory
echo "📁 Navigating to frontend directory..."
cd /home/ubuntu/scalebox/front-end || {
    echo "❌ Failed to navigate to frontend directory"
    exit 1
}

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in $(pwd)"
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install || {
        echo "❌ Failed to install dependencies"
        exit 1
    }
fi

# Start the Next.js frontend
echo "🚀 Starting Next.js frontend server..."
echo "   Directory: $(pwd)"
echo "   Command: npm run dev"
echo "   Port: 3000"
echo ""

# Start Next.js on port 3000 specifically
PORT=3000 npm run dev &
FRONTEND_PID=$!

# Wait a moment and check if it started successfully
sleep 5
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend started successfully (PID: $FRONTEND_PID)"
    echo "🌐 Frontend should be available at: http://localhost:3000"
    echo "📝 Note: It may take a few moments for Next.js to compile"
else
    echo "❌ Frontend failed to start"
    exit 1
fi 