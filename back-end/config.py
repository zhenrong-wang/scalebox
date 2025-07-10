import os
from dotenv import load_dotenv

# Load .env from the same directory as config.py
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

class Settings:
    # Database settings
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'scalebox')
    
    # Database connection pooling
    DB_POOL_SIZE = int(os.getenv('DB_POOL_SIZE', 20))
    DB_MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', 30))
    DB_POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', 3600))
    DB_POOL_TIMEOUT = int(os.getenv('DB_POOL_TIMEOUT', 30))

    # SMTP settings
    SMTP_HOST = os.getenv('SMTP_HOST')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 465))
    SMTP_USER = os.getenv('SMTP_USER')
    SMTP_PASS = os.getenv('SMTP_PASS')
    SMTP_FROM = os.getenv('SMTP_FROM')

    # Application settings
    APP_BASE_URL = os.getenv('APP_BASE_URL', 'http://localhost:3000')
    JWT_SECRET = os.getenv('JWT_SECRET', 'changeme')
    
    # Performance settings
    WORKERS = int(os.getenv('WORKERS', 4))  # Number of uvicorn workers
    MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', 1000))
    
    # Redis settings (for caching and background tasks)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # Environment
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

settings = Settings()

