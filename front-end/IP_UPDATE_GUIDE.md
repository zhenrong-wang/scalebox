# IP Address Update Guide

When your public IP address changes, follow these steps to make ScaleBox accessible again.

## 🚀 Quick Method (Recommended)

Use the automated script:

```bash
cd /home/ubuntu/scalebox/front-end
./update-ip.sh YOUR_NEW_PUBLIC_IP
```

Example:
```bash
./update-ip.sh 203.0.113.1
```

## 🔧 Manual Method

If you prefer to update manually:

### 1. Update Frontend Configuration

Edit `front-end/next.config.mjs`:

```javascript
env: {
  // Update this URL when your public IP address changes
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://YOUR_NEW_PUBLIC_IP:8000',
},
experimental: {
  // Update this array when your public IP address changes
  allowedDevOrigins: ['YOUR_NEW_PUBLIC_IP:3000'],
},
```

### 2. Restart the Development Server

```bash
cd /home/ubuntu/scalebox/front-end
pkill -f "next dev"
NEXT_PUBLIC_API_URL=http://YOUR_NEW_PUBLIC_IP:8000 npm run dev
```

## 🌐 Access URLs

After updating:

- **Frontend**: `http://YOUR_NEW_PUBLIC_IP:3000`
- **Backend API**: `http://YOUR_NEW_PUBLIC_IP:8000`

## 🔍 Verification

Test that everything is working:

```bash
# Test frontend
curl -s http://YOUR_NEW_PUBLIC_IP:3000 | grep -o "ScaleBox"

# Test backend authentication
curl -X POST http://YOUR_NEW_PUBLIC_IP:8000/users/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@scalebox.dev", "password": "Admin123!"}'
```

## 📝 Notes

- The backend server doesn't need IP-specific configuration
- Only the frontend needs to know the backend's public IP
- Make sure your firewall/security groups allow traffic on ports 3000 and 8000
- Consider using a domain name instead of IP addresses for production 