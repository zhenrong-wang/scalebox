#!/bin/bash

# Setup environment file for ScaleBox Golang Backend
echo "Setting up environment file for ScaleBox Golang Backend..."

# Check if .env already exists
if [ -f ".env" ]; then
    echo "Warning: .env file already exists. This will overwrite it."
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Create .env file
cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=scalebox

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE_HOURS=24

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@scalebox.com

# Server Configuration
PORT=8000
ENVIRONMENT=development
APP_BASE_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
EOF

echo "Environment file created successfully!"
echo ""
echo "Please update the following values in .env:"
echo "1. DB_PASSWORD - Your database password"
echo "2. SMTP_USER - Your email address"
echo "3. SMTP_PASS - Your email app password"
echo "4. JWT_SECRET - A secure random string for JWT signing"
echo ""
echo "You can now start the backend with: go run cmd/main.go" 