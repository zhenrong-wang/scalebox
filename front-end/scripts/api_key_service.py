import secrets
import string
import hashlib
import hmac
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import sqlite3
import os

class APIKeyService:
    def __init__(self, db_path: str = "api_keys.db"):
        """Initialize the API Key Service with database connection."""
        self.db_path = db_path
        self.secret_key = os.getenv('API_SECRET_KEY', 'your-secret-key-change-in-production')
        self._init_database()
    
    def _init_database(self):
        """Initialize the database with required tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create API keys table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                prefix TEXT NOT NULL,
                user_id TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                permissions TEXT DEFAULT '{}',
                rate_limit INTEGER DEFAULT 1000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP NULL,
                expires_at TIMESTAMP NULL
            )
        ''')
        
        # Create API key usage logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS api_key_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_id TEXT NOT NULL,
                endpoint TEXT,
                method TEXT,
                ip_address TEXT,
                user_agent TEXT,
                response_status INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (key_id) REFERENCES api_keys (key_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized successfully")
    
    def generate_api_key(self) -> Tuple[str, str]:
        """
        Generate a new API key with proper format and length.
        Format: sb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (51 characters total)
        Returns: (full_key, key_id)
        """
        # Generate a unique key ID (16 characters)
        key_id = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(16))
        
        # Generate the main secret part (32 characters)
        secret = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        
        # Create the full API key: sb- + key_id + secret = 3 + 16 + 32 = 51 characters
        full_key = f"sb-{key_id}{secret}"
        
        return full_key, key_id
    
    def _hash_key(self, api_key: str) -> str:
        """Hash the API key for secure storage."""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def create_api_key(self, 
                      name: str, 
                      user_id: str,
                      permissions: Dict = None,
                      rate_limit: int = 1000,
                      expires_in_days: Optional[int] = None) -> Dict:
        """
        Create a new API key.
        
        Args:
            name: Human-readable name for the API key
            user_id: ID of the user creating the key
            permissions: Dictionary of permissions (default: empty)
            rate_limit: Requests per hour limit (default: 1000)
            expires_in_days: Optional expiration in days
            
        Returns:
            Dictionary containing key information
        """
        try:
            # Generate the API key
            full_key, key_id = self.generate_api_key()
            key_hash = self._hash_key(full_key)
            prefix = full_key[:8] + "..." # Show first 8 characters for display
            
            # Calculate expiration date if specified
            expires_at = None
            if expires_in_days:
                expires_at = datetime.now() + timedelta(days=expires_in_days)
            
            # Store in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO api_keys 
                (key_id, name, key_hash, prefix, user_id, permissions, rate_limit, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                key_id,
                name,
                key_hash,
                prefix,
                user_id,
                json.dumps(permissions or {}),
                rate_limit,
                expires_at
            ))
            
            conn.commit()
            conn.close()
            
            print(f"API key created successfully: {name} (Length: {len(full_key)} characters)")
            
            return {
                'success': True,
                'api_key': full_key,  # Only return this once!
                'key_id': key_id,
                'name': name,
                'prefix': prefix,
                'status': 'active',
                'rate_limit': rate_limit,
                'created_at': datetime.now().isoformat(),
                'expires_at': expires_at.isoformat() if expires_at else None
            }
            
        except sqlite3.IntegrityError as e:
            print(f"Database integrity error: {e}")
            return {'success': False, 'error': 'Key ID collision, please try again'}
        except Exception as e:
            print(f"Error creating API key: {e}")
            return {'success': False, 'error': str(e)}
    
    def validate_api_key(self, api_key: str) -> Optional[Dict]:
        """
        Validate an API key and return key information if valid.
        
        Args:
            api_key: The full API key to validate
            
        Returns:
            Dictionary with key information if valid, None if invalid
        """
        try:
            # Check format: sb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (51 chars)
            if not api_key.startswith('sb-') or len(api_key) != 51:
                return None
            
            # Extract key_id (first 16 characters after sb-)
            key_id = api_key[3:19]
            key_hash = self._hash_key(api_key)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT key_id, name, user_id, status, permissions, rate_limit, 
                       created_at, expires_at, last_used_at
                FROM api_keys 
                WHERE key_id = ? AND key_hash = ?
            ''', (key_id, key_hash))
            
            result = cursor.fetchone()
            conn.close()
            
            if not result:
                return None
            
            # Check if key is active
            if result[3] != 'active':
                return None
            
            # Check if key has expired
            if result[7]:  # expires_at
                expires_at = datetime.fromisoformat(result[7])
                if datetime.now() > expires_at:
                    return None
            
            return {
                'key_id': result[0],
                'name': result[1],
                'user_id': result[2],
                'status': result[3],
                'permissions': json.loads(result[4]),
                'rate_limit': result[5],
                'created_at': result[6],
                'expires_at': result[7],
                'last_used_at': result[8]
            }
            
        except Exception as e:
            print(f"Error validating API key: {e}")
            return None
    
    def list_api_keys(self, user_id: str) -> List[Dict]:
        """
        List all API keys for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            List of API key information (without the actual keys)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT key_id, name, prefix, status, rate_limit, 
                       created_at, expires_at, last_used_at
                FROM api_keys 
                WHERE user_id = ?
                ORDER BY created_at DESC
            ''', (user_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            keys = []
            for result in results:
                keys.append({
                    'key_id': result[0],
                    'name': result[1],
                    'prefix': result[2],
                    'status': result[3],
                    'rate_limit': result[4],
                    'created_at': result[5],
                    'expires_at': result[6],
                    'last_used_at': result[7] or 'Never'
                })
            
            return keys
            
        except Exception as e:
            print(f"Error listing API keys: {e}")
            return []
    
    def update_api_key_status(self, key_id: str, user_id: str, status: str) -> bool:
        """
        Update the status of an API key (active/disabled).
        
        Args:
            key_id: ID of the key to update
            user_id: ID of the user (for authorization)
            status: New status ('active' or 'disabled')
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if status not in ['active', 'disabled']:
                return False
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE api_keys 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE key_id = ? AND user_id = ?
            ''', (status, key_id, user_id))
            
            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            if success:
                print(f"API key {key_id} status updated to {status}")
            
            return success
            
        except Exception as e:
            print(f"Error updating API key status: {e}")
            return False
    
    def delete_api_key(self, key_id: str, user_id: str) -> bool:
        """
        Delete an API key.
        
        Args:
            key_id: ID of the key to delete
            user_id: ID of the user (for authorization)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete usage logs first (foreign key constraint)
            cursor.execute('DELETE FROM api_key_usage WHERE key_id = ?', (key_id,))
            
            # Delete the API key
            cursor.execute('''
                DELETE FROM api_keys 
                WHERE key_id = ? AND user_id = ?
            ''', (key_id, user_id))
            
            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            if success:
                print(f"API key {key_id} deleted successfully")
            
            return success
            
        except Exception as e:
            print(f"Error deleting API key: {e}")
            return False
    
    def log_api_usage(self, key_id: str, endpoint: str, method: str, 
                     ip_address: str, user_agent: str, response_status: int):
        """
        Log API key usage for analytics and monitoring.
        
        Args:
            key_id: ID of the API key used
            endpoint: API endpoint accessed
            method: HTTP method
            ip_address: Client IP address
            user_agent: Client user agent
            response_status: HTTP response status code
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Log the usage
            cursor.execute('''
                INSERT INTO api_key_usage 
                (key_id, endpoint, method, ip_address, user_agent, response_status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (key_id, endpoint, method, ip_address, user_agent, response_status))
            
            # Update last_used_at for the API key
            cursor.execute('''
                UPDATE api_keys 
                SET last_used_at = CURRENT_TIMESTAMP
                WHERE key_id = ?
            ''', (key_id,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error logging API usage: {e}")
    
    def get_usage_stats(self, user_id: str, days: int = 30) -> Dict:
        """
        Get usage statistics for a user's API keys.
        
        Args:
            user_id: ID of the user
            days: Number of days to look back (default: 30)
            
        Returns:
            Dictionary with usage statistics
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get total requests in the last N days
            cursor.execute('''
                SELECT COUNT(*) as total_requests,
                       COUNT(DISTINCT key_id) as active_keys,
                       AVG(response_status < 400) * 100 as success_rate
                FROM api_key_usage u
                JOIN api_keys k ON u.key_id = k.key_id
                WHERE k.user_id = ? 
                AND u.timestamp >= datetime('now', '-{} days')
            '''.format(days), (user_id,))
            
            stats = cursor.fetchone()
            
            # Get requests by day
            cursor.execute('''
                SELECT DATE(u.timestamp) as date, COUNT(*) as requests
                FROM api_key_usage u
                JOIN api_keys k ON u.key_id = k.key_id
                WHERE k.user_id = ? 
                AND u.timestamp >= datetime('now', '-{} days')
                GROUP BY DATE(u.timestamp)
                ORDER BY date DESC
            '''.format(days), (user_id,))
            
            daily_usage = cursor.fetchall()
            conn.close()
            
            return {
                'total_requests': stats[0] or 0,
                'active_keys': stats[1] or 0,
                'success_rate': round(stats[2] or 0, 2),
                'daily_usage': [{'date': row[0], 'requests': row[1]} for row in daily_usage]
            }
            
        except Exception as e:
            print(f"Error getting usage stats: {e}")
            return {
                'total_requests': 0,
                'active_keys': 0,
                'success_rate': 0,
                'daily_usage': []
            }

# Example usage and testing
if __name__ == "__main__":
    # Initialize the service
    api_service = APIKeyService()
    
    # Test user ID
    test_user_id = "user_123456"
    
    print("=== API Key Service Demo ===\n")
    
    # Create some test API keys
    print("1. Creating API keys...")
    
    # Create a production API key
    prod_key = api_service.create_api_key(
        name="Production API",
        user_id=test_user_id,
        permissions={"read": True, "write": True},
        rate_limit=5000
    )
    
    if prod_key['success']:
        print(f"✓ Production key created: {prod_key['prefix']}")
        print(f"  Full key: {prod_key['api_key']} (Length: {len(prod_key['api_key'])} chars)")
        print(f"  Key ID: {prod_key['key_id']}")
    
    # Create a development API key with expiration
    dev_key = api_service.create_api_key(
        name="Development API",
        user_id=test_user_id,
        permissions={"read": True},
        rate_limit=1000,
        expires_in_days=30
    )
    
    if dev_key['success']:
        print(f"✓ Development key created: {dev_key['prefix']}")
        print(f"  Full key: {dev_key['api_key']} (Length: {len(dev_key['api_key'])} chars)")
        print(f"  Expires: {dev_key['expires_at']}")
    
    print("\n2. Listing API keys...")
    keys = api_service.list_api_keys(test_user_id)
    for key in keys:
        print(f"  • {key['name']} ({key['key_id']}) - Status: {key['status']}")
    
    print("\n3. Validating API key...")
    if prod_key['success']:
        validation = api_service.validate_api_key(prod_key['api_key'])
        if validation:
            print(f"✓ Key is valid: {validation['name']}")
            
            # Log some usage
            api_service.log_api_usage(
                validation['key_id'],
                "/api/v1/sandboxes",
                "GET",
                "192.168.1.1",
                "ScaleBox-Client/1.0",
                200
            )
            print("✓ Usage logged")
        else:
            print("✗ Key validation failed")
    
    print("\n4. Testing key format validation...")
    # Test invalid formats
    invalid_keys = [
        "invalid-key",
        "sb-short",
        "sb-" + "x" * 50,  # Wrong length
        "wrong-" + "x" * 46  # Wrong prefix
    ]
    
    for invalid_key in invalid_keys:
        result = api_service.validate_api_key(invalid_key)
        print(f"  Invalid key '{invalid_key[:15]}...' validation: {result is None} (should be True)")
    
    print("\n=== Demo completed ===")
