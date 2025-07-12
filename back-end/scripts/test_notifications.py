#!/usr/bin/env python3
"""
Script to test the notification endpoint with valid authentication
"""

import requests
import json

def test_notifications():
    """Test the notification endpoint"""
    
    # Login to get a token
    login_data = {
        "email": "495458966@qq.com",
        "password": "password123"  # Assuming this is the password
    }
    
    try:
        # Try to login
        login_response = requests.post(
            "http://43.199.160.148:8000/users/signin",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get("access_token")
            
            if access_token:
                print(f"✅ Login successful, got token: {access_token[:20]}...")
                
                # Test notifications endpoint
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                notifications_response = requests.get(
                    "http://43.199.160.148:8000/api/notifications/?limit=5",
                    headers=headers
                )
                
                print(f"📊 Notifications endpoint status: {notifications_response.status_code}")
                
                if notifications_response.status_code == 200:
                    data = notifications_response.json()
                    print(f"✅ Success! Found {data.get('total', 0)} notifications")
                    print(f"📱 Unread count: {data.get('unread_count', 0)}")
                    
                    notifications = data.get('notifications', [])
                    for i, notification in enumerate(notifications[:3]):
                        print(f"  {i+1}. {notification.get('title', 'No title')}")
                else:
                    print(f"❌ Error: {notifications_response.status_code}")
                    print(f"Response: {notifications_response.text}")
            else:
                print("❌ No access token in response")
                print(f"Response: {login_response.text}")
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing notification endpoint...")
    test_notifications()
    print("✨ Done!") 