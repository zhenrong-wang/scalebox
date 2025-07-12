// Test script to demonstrate the notification system
// Run this in the browser console after logging in

async function testNotifications() {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.error('No auth token found. Please log in first.');
      return;
    }

    const response = await fetch('http://43.199.160.148:8000/api/notifications/demo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Demo notifications created successfully!', result);
      console.log('📱 Check the notification bell icon in the header to see the new notifications.');
    } else {
      const error = await response.json();
      console.error('❌ Failed to create demo notifications:', error);
    }
  } catch (error) {
    console.error('❌ Error creating demo notifications:', error);
  }
}

// Instructions for use:
console.log(`
🎯 Notification System Demo
==========================
To test the notification system:

1. Make sure you're logged in to the ScaleBox application
2. Open the browser console (F12)
3. Run: testNotifications()
4. Check the notification bell icon in the header

The demo will create 8 different types of notifications:
- Welcome message (success)
- New template available (info)
- Budget alert (warning)
- API key expiring (warning)
- Sandbox stopped (info)
- System maintenance (info)
- New feature available (success)
- Security update (info)

Each notification will show with different icons and colors based on its type.
`);

// Export for use in console
window.testNotifications = testNotifications; 