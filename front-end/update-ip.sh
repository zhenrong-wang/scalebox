#!/bin/bash

# Script to update IP address in ScaleBox configuration
# Usage: ./update-ip.sh NEW_PUBLIC_IP

if [ $# -eq 0 ]; then
    echo "Usage: $0 NEW_PUBLIC_IP"
    echo "Example: $0 203.0.113.1"
    exit 1
fi

NEW_IP=$1
echo "Updating IP address to: $NEW_IP"

# Update next.config.mjs
sed -i "s/http:\/\/[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:8000/http:\/\/$NEW_IP:8000/g" next.config.mjs
sed -i "s/allowedDevOrigins: \['[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:3000'\]/allowedDevOrigins: ['$NEW_IP:3000']/g" next.config.mjs

echo "✅ Updated next.config.mjs"
echo "🔄 Restarting development server..."

# Kill existing server and restart with new environment variable
pkill -f "next dev" 2>/dev/null
sleep 2
NEXT_PUBLIC_API_URL=http://$NEW_IP:8000 npm run dev &

echo "✅ Development server restarted with new IP: $NEW_IP"
echo "🌐 Frontend accessible at: http://$NEW_IP:3000"
echo "🔗 Backend API accessible at: http://$NEW_IP:8000" 