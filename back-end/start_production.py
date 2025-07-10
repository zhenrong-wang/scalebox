#!/usr/bin/env python3
"""
Production startup script for ScaleBox backend
Optimized for high concurrency and performance
"""

import uvicorn
from config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=settings.WORKERS,
        loop="uvloop",  # Faster event loop implementation
        http="httptools",  # Faster HTTP parser
        access_log=True,
        log_level="info",
        # Performance optimizations
        limit_concurrency=settings.MAX_CONCURRENT_REQUESTS,
        limit_max_requests=10000,  # Restart workers after 10k requests
        timeout_keep_alive=30,
        timeout_graceful_shutdown=30,
    ) 