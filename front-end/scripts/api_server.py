from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn
from datetime import datetime
import json

from api_key_service import APIKeyService

# Initialize FastAPI app
app = FastAPI(
    title="ScaleBox API Key Management Service",
    description="API for managing ScaleBox API keys",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize API Key Service
api_key_service = APIKeyService()

# Security scheme
security = HTTPBearer()

# Pydantic models
class CreateAPIKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Name for the API key")
    permissions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Permissions for the API key")
    rate_limit: Optional[int] = Field(default=1000, ge=1, le=10000, description="Rate limit per hour")
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365, description="Expiration in days")

class UpdateAPIKeyRequest(BaseModel):
    status: str = Field(..., regex="^(active|disabled)$", description="New status for the API key")

class APIKeyResponse(BaseModel):
    key_id: str
    name: str
    prefix: str
    status: str
    rate_limit: int
    created_at: str
    expires_at: Optional[str]
    last_used_at: str

class CreateAPIKeyResponse(BaseModel):
    success: bool
    api_key: Optional[str] = None
    key_id: Optional[str] = None
    name: Optional[str] = None
    prefix: Optional[str] = None
    status: Optional[str] = None
    rate_limit: Optional[int] = None
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    error: Optional[str] = None

class UsageStatsResponse(BaseModel):
    total_requests: int
    active_keys: int
    success_rate: float
    daily_usage: List[Dict[str, Any]]

# Dependency to get current user (mock implementation)
async def get_current_user(request: Request) -> str:
    """
    Mock function to get current user ID.
    In production, this would validate JWT tokens or session cookies.
    """
    # For demo purposes, we'll use a header or default user
    user_id = request.headers.get("X-User-ID", "user_123456")
    return user_id

# Dependency to validate API key for protected endpoints
async def validate_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Validate API key from Authorization header."""
    if not credentials:
        raise HTTPException(status_code=401, detail="API key required")
    
    api_key = credentials.credentials
    validation = api_key_service.validate_api_key(api_key)
    
    if not validation:
        raise HTTPException(status_code=401, detail="Invalid or expired API key")
    
    return validation

# API Endpoints

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "service": "ScaleBox API Key Management",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/keys", response_model=CreateAPIKeyResponse, tags=["API Keys"])
async def create_api_key(
    request: CreateAPIKeyRequest,
    user_id: str = Depends(get_current_user)
):
    """Create a new API key for the authenticated user."""
    try:
        result = api_key_service.create_api_key(
            name=request.name,
            user_id=user_id,
            permissions=request.permissions,
            rate_limit=request.rate_limit,
            expires_in_days=request.expires_in_days
        )
        
        return CreateAPIKeyResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}")

@app.get("/api/v1/keys", response_model=List[APIKeyResponse], tags=["API Keys"])
async def list_api_keys(user_id: str = Depends(get_current_user)):
    """List all API keys for the authenticated user."""
    try:
        keys = api_key_service.list_api_keys(user_id)
        return [APIKeyResponse(**key) for key in keys]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list API keys: {str(e)}")

@app.put("/api/v1/keys/{key_id}", tags=["API Keys"])
async def update_api_key(
    key_id: str,
    request: UpdateAPIKeyRequest,
    user_id: str = Depends(get_current_user)
):
    """Update an API key's status (enable/disable)."""
    try:
        success = api_key_service.update_api_key_status(key_id, user_id, request.status)
        
        if not success:
            raise HTTPException(status_code=404, detail="API key not found or unauthorized")
        
        return {"success": True, "message": f"API key status updated to {request.status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update API key: {str(e)}")

@app.delete("/api/v1/keys/{key_id}", tags=["API Keys"])
async def delete_api_key(
    key_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete an API key."""
    try:
        success = api_key_service.delete_api_key(key_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="API key not found or unauthorized")
        
        return {"success": True, "message": "API key deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete API key: {str(e)}")

@app.get("/api/v1/keys/usage", response_model=UsageStatsResponse, tags=["Analytics"])
async def get_usage_statistics(
    days: int = 30,
    user_id: str = Depends(get_current_user)
):
    """Get usage statistics for the user's API keys."""
    try:
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        stats = api_key_service.get_usage_stats(user_id, days)
        return UsageStatsResponse(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get usage statistics: {str(e)}")

@app.post("/api/v1/validate", tags=["Validation"])
async def validate_key(api_key_info: Dict = Depends(validate_api_key)):
    """Validate an API key (protected endpoint example)."""
    return {
        "valid": True,
        "key_info": {
            "key_id": api_key_info["key_id"],
            "name": api_key_info["name"],
            "user_id": api_key_info["user_id"],
            "rate_limit": api_key_info["rate_limit"],
            "permissions": api_key_info["permissions"]
        }
    }

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log API requests for keys that include Authorization header."""
    response = await call_next(request)
    
    # Log API usage if Authorization header is present
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        api_key = auth_header.replace("Bearer ", "")
        validation = api_key_service.validate_api_key(api_key)
        
        if validation:
            api_key_service.log_api_usage(
                key_id=validation["key_id"],
                endpoint=str(request.url.path),
                method=request.method,
                ip_address=request.client.host if request.client else "unknown",
                user_agent=request.headers.get("User-Agent", "unknown"),
                response_status=response.status_code
            )
    
    return response

# Run the server
if __name__ == "__main__":
    print("Starting ScaleBox API Key Management Service...")
    print("API Documentation available at: http://localhost:8000/docs")
    print("Alternative docs at: http://localhost:8000/redoc")
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
