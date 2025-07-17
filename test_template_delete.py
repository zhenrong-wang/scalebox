#!/usr/bin/env python3
import requests
import json

# Test the template delete functionality
def test_template_delete():
    base_url = "http://localhost:8000"
    
    # 1. First, sign in to get a token
    print("1. Signing in to get authentication token...")
    signin_data = {
        "email": "admin@scalebox.dev",
        "password": "admin123"  # Default admin password
    }
    
    try:
        signin_response = requests.post(f"{base_url}/users/signin", json=signin_data)
        if signin_response.status_code == 200:
            token_data = signin_response.json()
            token = token_data.get("access_token")
            print(f"✅ Successfully got token: {token[:20]}...")
        else:
            print(f"❌ Signin failed: {signin_response.status_code} - {signin_response.text}")
            return
    except Exception as e:
        print(f"❌ Signin request failed: {e}")
        return
    
    # 2. Get templates to find a private one
    print("\n2. Getting templates...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        templates_response = requests.get(f"{base_url}/api/templates", headers=headers)
        if templates_response.status_code == 200:
            templates_data = templates_response.json()
            templates = templates_data.get("templates", [])
            print(f"✅ Found {len(templates)} templates")
            
            # Find a private template (owned by the user)
            private_template = None
            for template in templates:
                if template.get("owner_id") is not None:  # Private template
                    private_template = template
                    break
            
            if private_template:
                template_id = private_template["id"]
                template_name = private_template["name"]
                print(f"✅ Found private template: {template_name} (ID: {template_id})")
            else:
                print("❌ No private templates found")
                return
        else:
            print(f"❌ Failed to get templates: {templates_response.status_code} - {templates_response.text}")
            return
    except Exception as e:
        print(f"❌ Templates request failed: {e}")
        return
    
    # 3. Test delete the private template
    print(f"\n3. Testing delete for template: {template_name}")
    
    try:
        delete_response = requests.delete(f"{base_url}/api/templates/{template_id}", headers=headers)
        print(f"Delete response status: {delete_response.status_code}")
        print(f"Delete response body: {delete_response.text}")
        
        if delete_response.status_code == 200:
            print("✅ Template delete successful!")
        else:
            print(f"❌ Template delete failed: {delete_response.status_code}")
    except Exception as e:
        print(f"❌ Delete request failed: {e}")

if __name__ == "__main__":
    test_template_delete() 