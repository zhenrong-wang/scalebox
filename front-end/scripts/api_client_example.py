import requests
import json
from typing import Dict, List, Optional

class ScaleBoxAPIClient:
    """Client for interacting with ScaleBox API Key Management Service."""
    
    def __init__(self, base_url: str = "http://localhost:8000", user_id: str = "user_123456"):
        self.base_url = base_url.rstrip('/')
        self.user_id = user_id
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "X-User-ID": user_id
        })
    
    def create_api_key(self, 
                      name: str, 
                      permissions: Dict = None,
                      rate_limit: int = 1000,
                      expires_in_days: Optional[int] = None) -> Dict:
        """Create a new API key."""
        payload = {
            "name": name,
            "permissions": permissions or {},
            "rate_limit": rate_limit
        }
        
        if expires_in_days:
            payload["expires_in_days"] = expires_in_days
        
        response = self.session.post(f"{self.base_url}/api/v1/keys", json=payload)
        response.raise_for_status()
        return response.json()
    
    def list_api_keys(self) -> List[Dict]:
        """List all API keys for the user."""
        response = self.session.get(f"{self.base_url}/api/v1/keys")
        response.raise_for_status()
        return response.json()
    
    def update_api_key_status(self, key_id: str, status: str) -> Dict:
        """Update an API key's status."""
        payload = {"status": status}
        response = self.session.put(f"{self.base_url}/api/v1/keys/{key_id}", json=payload)
        response.raise_for_status()
        return response.json()
    
    def delete_api_key(self, key_id: str) -> Dict:
        """Delete an API key."""
        response = self.session.delete(f"{self.base_url}/api/v1/keys/{key_id}")
        response.raise_for_status()
        return response.json()
    
    def get_usage_statistics(self, days: int = 30) -> Dict:
        """Get usage statistics."""
        response = self.session.get(f"{self.base_url}/api/v1/keys/usage?days={days}")
        response.raise_for_status()
        return response.json()
    
    def validate_api_key(self, api_key: str) -> Dict:
        """Validate an API key."""
        headers = {"Authorization": f"Bearer {api_key}"}
        response = self.session.post(f"{self.base_url}/api/v1/validate", headers=headers)
        response.raise_for_status()
        return response.json()

# Example usage
if __name__ == "__main__":
    print("=== ScaleBox API Client Demo ===\n")
    
    # Initialize client
    client = ScaleBoxAPIClient()
    
    try:
        # Test server health
        response = requests.get("http://localhost:8000/")
        print(f"✓ Server is running: {response.json()['status']}\n")
        
        # Create API keys
        print("1. Creating API keys...")
        
        prod_key = client.create_api_key(
            name="Production API Key",
            permissions={"read": True, "write": True, "admin": False},
            rate_limit=5000
        )
        
        if prod_key['success']:
            print(f"✓ Production key created: {prod_key['name']}")
            print(f"  API Key: {prod_key['api_key']}")
            print(f"  Key ID: {prod_key['key_id']}")
            
            # Store the API key for later use
            production_api_key = prod_key['api_key']
            production_key_id = prod_key['key_id']
        
        dev_key = client.create_api_key(
            name="Development API Key",
            permissions={"read": True, "write": False},
            rate_limit=1000,
            expires_in_days=30
        )
        
        if dev_key['success']:
            print(f"✓ Development key created: {dev_key['name']}")
            print(f"  Expires: {dev_key['expires_at']}")
        
        print("\n2. Listing API keys...")
        keys = client.list_api_keys()
        for key in keys:
            print(f"  • {key['name']} ({key['key_id']}) - Status: {key['status']}")
        
        print("\n3. Validating API key...")
        if 'production_api_key' in locals():
            validation = client.validate_api_key(production_api_key)
            print(f"✓ Key validation successful: {validation['key_info']['name']}")
        
        print("\n4. Getting usage statistics...")
        stats = client.get_usage_statistics()
        print(f"  Total requests: {stats['total_requests']}")
        print(f"  Active keys: {stats['active_keys']}")
        print(f"  Success rate: {stats['success_rate']}%")
        
        print("\n5. Testing key management...")
        if 'production_key_id' in locals():
            # Disable key
            result = client.update_api_key_status(production_key_id, "disabled")
            print(f"✓ Key disabled: {result['success']}")
            
            # Re-enable key
            result = client.update_api_key_status(production_key_id, "active")
            print(f"✓ Key re-enabled: {result['success']}")
        
        print("\n=== Demo completed successfully ===")
        
    except requests.exceptions.ConnectionError:
        print("✗ Error: Could not connect to the API server.")
        print("Make sure the server is running with: python api_server.py")
    except Exception as e:
        print(f"✗ Error: {e}")
