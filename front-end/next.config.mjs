/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // Update this URL when your public IP address changes
    // Format: http://YOUR_NEW_PUBLIC_IP:8000
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  experimental: {
    // Update this array when your public IP address changes
    // Format: ['YOUR_NEW_PUBLIC_IP:3000']
    allowedDevOrigins: ['43.198.218.173:3000'],
  },
}

export default nextConfig
