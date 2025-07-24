#!/bin/bash

# ScaleBox - Restart All Services Script
# This script restarts both the frontend and backend services using existing scripts

set -e

echo "🔄 ScaleBox - Restarting All Services"
echo "======================================"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📋 Restarting backend..."
"$SCRIPT_DIR/restart-backend.sh"

echo ""
echo "📋 Restarting frontend..."
"$SCRIPT_DIR/restart-frontend.sh"

echo ""
echo "🎉 All services restarted successfully!"
echo "======================================"
echo "📊 Service Status:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000 (or 3001 if 3000 was in use)"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /home/ubuntu/scalebox/back-end/backend.log"
echo "   Frontend: tail -f /home/ubuntu/scalebox/front-end/frontend.log" 