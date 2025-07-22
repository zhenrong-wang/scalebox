# ScaleBox Go Backend

This is the Go implementation of the ScaleBox backend, designed for high performance and throughput.

## Features

- **High Performance**: Built with Go and Gin for optimal performance
- **Database**: MySQL with GORM for efficient data access
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Email Management**: Secure email change with double confirmation
- **User Management**: Role-based access control with root users
- **Project Management**: Multi-tenant project organization
- **Sandbox Management**: Containerized development environments
- **API Keys**: Secure API key management
- **Notifications**: Real-time notification system

## Architecture

```
go-backend/
├── cmd/
│   └── main.go              # Application entry point
├── internal/
│   ├── api/                 # HTTP handlers and routes
│   ├── config/              # Configuration management
│   ├── database/            # Database connection and setup
│   ├── models/              # GORM models
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── migrations/              # Database migrations
├── scripts/                 # Utility scripts
├── go.mod                   # Go module file
└── README.md               # This file
```

## Prerequisites

- Go 1.21 or higher
- MySQL 8.0 or higher
- Git

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scalebox/go-backend
   ```

2. **Install dependencies**
   ```bash
   go mod tidy
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=scalebox

   # JWT
   JWT_SECRET=your-secret-key
   JWT_EXPIRE_HOURS=24

   # SMTP
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@scalebox.com

   # Server
   PORT=8000
   ENVIRONMENT=development
   APP_BASE_URL=http://localhost:3000
   ```

4. **Set up database**
   ```bash
   # Create database
   mysql -u root -p -e "CREATE DATABASE scalebox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

5. **Run the application**
   ```bash
   go run cmd/main.go
   ```

## Development

### Running in Development Mode
```bash
go run cmd/main.go
```

### Running Tests
```bash
go test ./...
```

### Building for Production
```bash
go build -o bin/scalebox-backend cmd/main.go
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/reset-password/confirm` - Confirm password reset

### User Management
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `POST /api/user-management/users` - Create user (root only)
- `GET /api/user-management/users` - List users (root only)
- `PUT /api/user-management/users/:user_id` - Update user (root only)
- `DELETE /api/user-management/users/:user_id` - Delete user (root only)

### Account Email Management
- `POST /api/user-management/account/request-email-change` - Request email change (root only)
- `POST /api/user-management/account/confirm-email-change` - Confirm email change
- `GET /api/user-management/account/email-change-status` - Get email change status (root only)

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:project_id` - Get project
- `PUT /api/projects/:project_id` - Update project
- `DELETE /api/projects/:project_id` - Delete project

### Sandboxes
- `POST /api/sandboxes` - Create sandbox
- `GET /api/sandboxes` - List sandboxes
- `GET /api/sandboxes/:sandbox_id` - Get sandbox
- `PUT /api/sandboxes/:sandbox_id` - Update sandbox
- `DELETE /api/sandboxes/:sandbox_id` - Delete sandbox
- `POST /api/sandboxes/:sandbox_id/start` - Start sandbox
- `POST /api/sandboxes/:sandbox_id/stop` - Stop sandbox

### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:notification_id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read

### API Keys
- `POST /api/api-keys` - Create API key
- `GET /api/api-keys` - List API keys
- `DELETE /api/api-keys/:key_id` - Delete API key

## Performance Benefits

Compared to the Python/FastAPI implementation:

1. **Concurrent Request Handling**: Go's goroutines provide excellent concurrency
2. **Memory Efficiency**: Lower memory footprint per request
3. **Faster Startup**: No Python interpreter startup time
4. **Better CPU Utilization**: More efficient CPU usage
5. **Compiled Performance**: Native binary execution
6. **Garbage Collection**: Optimized for high-throughput scenarios

## Security Features

- **Password Hashing**: bcrypt with configurable cost
- **JWT Tokens**: Secure token-based authentication
- **Email Verification**: Double confirmation for email changes
- **API Key Management**: Secure API key generation and storage
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: GORM provides parameterized queries

## Monitoring and Logging

- **Structured Logging**: Using logrus for structured logging
- **Request Logging**: All API requests are logged
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Metrics**: Built-in performance monitoring

## Deployment

### Docker
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o main cmd/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
CMD ["./main"]
```

### Environment Variables for Production
- Set `ENVIRONMENT=production`
- Use strong `JWT_SECRET`
- Configure production database credentials
- Set up proper SMTP configuration
- Configure `APP_BASE_URL` for production domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. 