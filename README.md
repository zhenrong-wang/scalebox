# ScaleBox

A full-stack user management system with modern authentication, admin dashboard, and sandbox management capabilities.

## Features

### Authentication & User Management
- **User Registration & Login**: Secure signup/signin with email verification
- **Email Verification**: 6-digit code verification system
- **Password Reset**: Secure password reset via email links
- **Account Management**: User profile management and settings
- **Role-based Access**: Admin and user roles with different permissions

### Admin Dashboard
- **User Management**: View, edit, and manage all users
- **User Statistics**: Real-time user analytics and metrics
- **Account Management**: Enable/disable users and manage account status
- **System Health**: Monitor system performance and health

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **Rate Limiting**: Protection against brute force attacks
- **Captcha Protection**: Anti-bot verification system
- **Email Validation**: Secure email verification process

### Frontend Features
- **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Theme**: Theme switching capability
- **Internationalization**: Multi-language support
- **Real-time Updates**: Live data updates and notifications

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **MariaDB**: Database
- **Alembic**: Database migrations
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing
- **AIOSMTP**: Async email sending

### Frontend
- **Next.js 15**: React framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: Modern UI components
- **React Hook Form**: Form handling
- **Zod**: Schema validation

## Project Structure

```
scalebox/
├── back-end/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   └── users.py         # User management endpoints
│   ├── alembic/             # Database migrations
│   ├── config.py            # Configuration settings
│   ├── requirements.txt     # Python dependencies
│   └── scripts/             # Utility scripts
├── front-end/               # Next.js frontend
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   │   ├── admin/          # Admin dashboard components
│   │   ├── ui/             # Reusable UI components
│   │   └── ...             # Other components
│   ├── services/           # API service functions
│   ├── types/              # TypeScript type definitions
│   └── package.json        # Node.js dependencies
└── README.md               # This file
```

## Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+
- MariaDB/MySQL
- SMTP server (for email functionality)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd back-end
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   Create `.env` file in `back-end/app/` with:
   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=scalebox
   JWT_SECRET=your_jwt_secret
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   SMTP_FROM=noreply@yourdomain.com
   APP_BASE_URL=http://localhost:3000
   ```

5. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Create admin user**:
   ```bash
   python scripts/create_admin.py
   ```

7. **Start backend server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd front-end
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Default Admin Account

After running the admin creation script, you can log in with:
- **Email**: admin@scalebox.dev
- **Password**: Admin123!

## API Endpoints

### Authentication
- `POST /users/signup` - User registration
- `POST /users/signin` - User login
- `POST /users/verify-email` - Email verification
- `POST /users/reset-password` - Request password reset
- `POST /users/reset-password/confirm` - Confirm password reset

### User Management
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile

### Admin Endpoints
- `GET /users/admin/users` - Get all users (admin only)
- `GET /users/admin/user-stats` - Get user statistics (admin only)
- `PUT /users/admin/users/{account_id}/status` - Update user status (admin only)
- `DELETE /users/admin/users/{account_id}` - Delete user (admin only)

## Development

### Database Migrations
To create a new migration:
```bash
cd back-end
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Code Style
- Backend: Follow PEP 8 Python style guide
- Frontend: Use Prettier and ESLint for code formatting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team. 