# ScaleBox Backend Migration to Golang

This document outlines the migration of the ScaleBox backend from Python (FastAPI) to Golang (Gin).

## Overview

The backend has been successfully migrated to Golang with the following improvements:

- **Performance**: Golang provides better performance and lower memory usage
- **Type Safety**: Strong typing reduces runtime errors
- **Concurrency**: Better handling of concurrent requests
- **Deployment**: Single binary deployment simplifies containerization

## Architecture

### Backend Structure
```
go-backend/
├── cmd/
│   └── main.go              # Application entry point
├── internal/
│   ├── api/                 # HTTP handlers and routes
│   │   ├── auth.go          # Authentication endpoints
│   │   ├── auth_helpers.go  # JWT and auth utilities
│   │   ├── notifications.go # Notification management
│   │   ├── projects.go      # Project management
│   │   ├── sandboxes.go     # Sandbox management
│   │   ├── server.go        # Server setup and routing
│   │   ├── templates.go     # Template management
│   │   ├── user_management.go # User management
│   │   └── api_keys.go      # API key management
│   ├── config/              # Configuration management
│   ├── database/            # Database connection and setup
│   ├── models/              # Data models
│   ├── services/            # Business logic services
│   └── utils/               # Utility functions
├── migrations/              # Database migrations
└── scripts/                 # Utility scripts
```

### API Endpoints

The Golang backend provides the same API endpoints as the Python backend:

#### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password/confirm` - Confirm password reset

#### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile

#### User Management
- `POST /api/user-management/users` - Create user (admin)
- `GET /api/user-management/users` - List users (admin)
- `GET /api/user-management/users/:user_id` - Get user details (admin)
- `PUT /api/user-management/users/:user_id` - Update user (admin)
- `DELETE /api/user-management/users/:user_id` - Delete user (admin)
- `POST /api/user-management/change-password` - Change password
- `POST /api/user-management/reset-own-password` - Reset own password

#### Projects
- `POST /api/projects/` - Create project
- `GET /api/projects/` - List projects
- `GET /api/projects/:project_id` - Get project details
- `PUT /api/projects/:project_id` - Update project
- `DELETE /api/projects/:project_id` - Delete project
- `GET /api/projects/:project_id/sandboxes` - Get project sandboxes
- `POST /api/projects/:project_id/sandboxes/:sandbox_id/evict` - Evict sandbox from project
- `POST /api/projects/:project_id/sandboxes/:sandbox_id/add` - Add sandbox to project

#### Sandboxes
- `POST /api/sandboxes/` - Create sandbox
- `GET /api/sandboxes/` - List sandboxes
- `GET /api/sandboxes/:sandbox_id` - Get sandbox details
- `PUT /api/sandboxes/:sandbox_id` - Update sandbox
- `DELETE /api/sandboxes/:sandbox_id` - Delete sandbox
- `POST /api/sandboxes/:sandbox_id/start` - Start sandbox
- `POST /api/sandboxes/:sandbox_id/stop` - Stop sandbox
- `POST /api/sandboxes/:sandbox_id/switch-project` - Switch sandbox project

#### Templates
- `GET /api/templates/` - List templates (public)
- `GET /api/templates/:template_id` - Get template details
- `POST /api/templates/` - Create template (authenticated)
- `PUT /api/templates/:template_id` - Update template (authenticated)
- `DELETE /api/templates/:template_id` - Delete template (authenticated)

#### Notifications
- `GET /api/notifications/` - List notifications
- `GET /api/notifications/:notification_id` - Get notification details
- `PATCH /api/notifications/:notification_id/read` - Mark notification as read
- `PATCH /api/notifications/:notification_id/unread` - Mark notification as unread
- `PATCH /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:notification_id` - Delete notification
- `DELETE /api/notifications/` - Delete all notifications
- `DELETE /api/notifications/bulk-delete` - Delete multiple notifications
- `PATCH /api/notifications/bulk-read` - Mark multiple notifications as read
- `PATCH /api/notifications/bulk-unread` - Mark multiple notifications as unread

#### API Keys
- `POST /api/api-keys/` - Create API key
- `GET /api/api-keys/` - List API keys
- `DELETE /api/api-keys/:key_id` - Delete API key

## Setup Instructions

### Prerequisites
- Go 1.21 or later
- MySQL 8.0 or later
- SMTP server (for email notifications)

### 1. Environment Setup

Run the setup script to create the environment file:

```bash
cd go-backend
./setup-env.sh
```

Then edit the `.env` file with your actual credentials:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
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
```

### 2. Database Setup

The Golang backend uses the same database schema as the Python backend. If you're migrating from the Python backend, your existing database should work without changes.

If starting fresh, create the database:

```sql
CREATE DATABASE scalebox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Dependencies

Install Go dependencies:

```bash
cd go-backend
go mod tidy
```

### 4. Running the Backend

Start the backend server:

```bash
cd go-backend
go run cmd/main.go
```

The server will start on port 8000 by default.

### 5. Frontend Configuration

The frontend has been updated to work with the Golang backend. The main changes are:

- Authentication endpoints moved from `/api/users/` to `/api/auth/`
- All other endpoints remain the same
- Added support for additional notification endpoints

## Migration from Python Backend

### 1. Stop Python Backend

```bash
# Kill any running uvicorn processes
pkill -f uvicorn
```

### 2. Start Golang Backend

```bash
cd go-backend
go run cmd/main.go
```

### 3. Update Frontend Environment

Ensure your frontend is configured to use the Golang backend:

```bash
# In front-end/.env.local or environment variables
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Test the Migration

1. Test user registration and login
2. Test sandbox creation and management
3. Test project management
4. Test notifications
5. Test admin functions

## Key Differences from Python Backend

### 1. Authentication Endpoints
- **Python**: `/api/users/signup`, `/api/users/signin`
- **Golang**: `/api/auth/signup`, `/api/auth/signin`

### 2. HTTP Methods
- **Python**: Uses PUT for some operations
- **Golang**: Uses PATCH for notification operations (more RESTful)

### 3. Response Format
- **Python**: Uses FastAPI's automatic serialization
- **Golang**: Manual JSON response construction for better control

### 4. Error Handling
- **Python**: FastAPI automatic error responses
- **Golang**: Consistent error response format

## Development

### Adding New Endpoints

1. Add the handler function in the appropriate file under `internal/api/`
2. Add the route in `internal/api/server.go`
3. Update the frontend service if needed

### Database Migrations

The Golang backend uses GORM for database operations. For schema changes:

1. Update the model in `internal/models/`
2. GORM will auto-migrate on startup in development mode
3. For production, use proper migration scripts

### Testing

Run tests:

```bash
cd go-backend
go test ./...
```

## Production Deployment

### Docker

Build the Docker image:

```bash
cd go-backend
docker build -t scalebox-backend .
```

Run the container:

```bash
docker run -p 8000:8000 --env-file .env scalebox-backend
```

### Environment Variables

For production, set these environment variables:

- `ENVIRONMENT=production`
- `JWT_SECRET` - Use a strong, random secret
- `DB_PASSWORD` - Use a strong database password
- `SMTP_PASS` - Use app-specific password for email

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure MySQL is running and credentials are correct
2. **Port Conflicts**: Ensure port 8000 is available
3. **CORS Issues**: Frontend and backend must be on compatible origins
4. **JWT Issues**: Ensure JWT_SECRET is set and consistent

### Logs

The backend logs to stdout. Check logs for errors:

```bash
go run cmd/main.go 2>&1 | tee backend.log
```

## Support

For issues or questions about the migration:

1. Check the logs for error messages
2. Verify environment configuration
3. Test individual endpoints with curl or Postman
4. Ensure database connectivity

## Future Improvements

- Add comprehensive API documentation with Swagger
- Implement rate limiting
- Add metrics and monitoring
- Implement caching layer
- Add WebSocket support for real-time notifications 