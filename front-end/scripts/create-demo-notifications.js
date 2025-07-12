// Script to create demo notifications for user 485458966@qq.com
// Run this in the browser console after logging in as 485458966@qq.com

async function createDemoNotifications() {
  try {
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.error('❌ No auth token found. Please log in as 485458966@qq.com first.');
      return;
    }

    console.log('🔑 Found auth token, creating demo notifications...');

    // Call the demo endpoint
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
      console.log('🔔 You should now see a number badge on the notification icon.');
      
      // Refresh the page to show the new notifications
      setTimeout(() => {
        console.log('🔄 Refreshing page to show new notifications...');
        window.location.reload();
      }, 2000);
    } else {
      const errorData = await response.json();
      console.error('❌ Failed to create demo notifications:', errorData);
    }
  } catch (error) {
    console.error('❌ Error creating demo notifications:', error);
  }
}

// Alternative: Create notifications directly via API calls
async function createDirectNotifications() {
  try {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      console.error('❌ No auth token found. Please log in first.');
      return;
    }

    const demoNotifications = [
      {
        title: "Welcome to ScaleBox! 🎉",
        message: "Your account has been successfully created. You can now start creating sandboxes and templates.",
        type: "success"
      },
      {
        title: "New Template Available",
        message: "A new React TypeScript template has been added to the template library. Check it out!",
        type: "info"
      },
      {
        title: "System Maintenance Notice",
        message: "Scheduled maintenance will occur on Sunday at 2 AM UTC. Service may be temporarily unavailable.",
        type: "warning"
      },
      {
        title: "API Key Expiring Soon",
        message: "Your API key 'production-key-1' will expire in 7 days. Please rotate it soon.",
        type: "warning"
      },
      {
        title: "Sandbox Created Successfully",
        message: "Your new sandbox 'my-test-project' has been created and is ready to use.",
        type: "success"
      }
    ];

    console.log('📝 Creating demo notifications...');

    for (const notification of demoNotifications) {
      const response = await fetch('http://43.199.160.148:8000/api/notifications/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (response.ok) {
        console.log(`✅ Created notification: ${notification.title}`);
      } else {
        console.error(`❌ Failed to create notification: ${notification.title}`);
      }
    }

    console.log('🎉 All demo notifications created! Check the notification bell icon.');
    
    // Refresh after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('❌ Error creating notifications:', error);
  }
}

// Export functions for use in console
window.createDemoNotifications = createDemoNotifications;
window.createDirectNotifications = createDirectNotifications;

console.log('📋 Demo notification functions loaded!');
console.log('💡 Run createDemoNotifications() to use the demo endpoint');
console.log('💡 Run createDirectNotifications() to create notifications directly'); 