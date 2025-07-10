import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@scalebox.dev"
ADMIN_PASSWORD = "Admin123!"

def test_sandbox_api():
    print("Testing Sandbox API...")
    
    # Step 1: Login as admin
    print("\n1. Logging in as admin...")
    login_response = requests.post(f"{BASE_URL}/users/signin", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Login successful")
    
    # Step 2: Test getting all sandboxes (admin endpoint)
    print("\n2. Testing admin sandbox list...")
    admin_response = requests.get(f"{BASE_URL}/sandboxes/admin/all", headers=headers)
    
    if admin_response.status_code == 200:
        sandboxes = admin_response.json()
        print(f"✓ Admin sandbox list successful: {len(sandboxes)} sandboxes found")
        for sandbox in sandboxes[:3]:  # Show first 3
            print(f"  - {sandbox['name']} ({sandbox['status']}) - {sandbox['framework']}")
    else:
        print(f"✗ Admin sandbox list failed: {admin_response.status_code} - {admin_response.text}")
    
    # Step 3: Test getting sandbox stats (admin endpoint)
    print("\n3. Testing admin sandbox stats...")
    stats_response = requests.get(f"{BASE_URL}/sandboxes/admin/stats", headers=headers)
    
    if stats_response.status_code == 200:
        stats = stats_response.json()
        print(f"✓ Admin stats successful:")
        print(f"  - Total sandboxes: {stats['total_sandboxes']}")
        print(f"  - Running: {stats['running_sandboxes']}")
        print(f"  - Stopped: {stats['stopped_sandboxes']}")
        print(f"  - Error: {stats['error_sandboxes']}")
        print(f"  - Total cost: ${stats['total_cost']:.2f}")
    else:
        print(f"✗ Admin stats failed: {stats_response.status_code} - {stats_response.text}")
    
    # Step 4: Test user sandbox list (should be empty for admin)
    print("\n4. Testing user sandbox list...")
    user_response = requests.get(f"{BASE_URL}/sandboxes/", headers=headers)
    
    if user_response.status_code == 200:
        user_sandboxes = user_response.json()
        print(f"✓ User sandbox list successful: {len(user_sandboxes)} sandboxes found")
    else:
        print(f"✗ User sandbox list failed: {user_response.status_code} - {user_response.text}")
    
    # Step 5: Test creating a sandbox
    print("\n5. Testing sandbox creation...")
    create_data = {
        "name": "Test Sandbox",
        "description": "A test sandbox created via API",
        "framework": "React",
        "region": "us-east-1",
        "visibility": "private"
    }
    
    create_response = requests.post(f"{BASE_URL}/sandboxes/", 
                                  headers=headers, 
                                  json=create_data)
    
    if create_response.status_code == 200:
        new_sandbox = create_response.json()
        print(f"✓ Sandbox creation successful: {new_sandbox['id']}")
        
        # Step 6: Test starting the sandbox
        print("\n6. Testing sandbox start...")
        start_response = requests.post(f"{BASE_URL}/sandboxes/{new_sandbox['id']}/start", 
                                     headers=headers)
        
        if start_response.status_code == 200:
            print("✓ Sandbox start successful")
        else:
            print(f"✗ Sandbox start failed: {start_response.status_code} - {start_response.text}")
        
        # Step 7: Test stopping the sandbox
        print("\n7. Testing sandbox stop...")
        stop_response = requests.post(f"{BASE_URL}/sandboxes/{new_sandbox['id']}/stop", 
                                    headers=headers)
        
        if stop_response.status_code == 200:
            result = stop_response.json()
            print(f"✓ Sandbox stop successful (cost increment: ${result.get('cost_increment', 0):.4f})")
        else:
            print(f"✗ Sandbox stop failed: {stop_response.status_code} - {stop_response.text}")
        
        # Step 8: Test deleting the sandbox
        print("\n8. Testing sandbox deletion...")
        delete_response = requests.delete(f"{BASE_URL}/sandboxes/{new_sandbox['id']}", 
                                        headers=headers)
        
        if delete_response.status_code == 200:
            print("✓ Sandbox deletion successful")
        else:
            print(f"✗ Sandbox deletion failed: {delete_response.status_code} - {delete_response.text}")
        
    else:
        print(f"✗ Sandbox creation failed: {create_response.status_code} - {create_response.text}")
    
    print("\n✓ Sandbox API test completed!")

if __name__ == "__main__":
    test_sandbox_api() 