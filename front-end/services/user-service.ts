interface User {
  id: string
  name: string
  email: string
  role: "user" | "admin"
  createdAt: string
  lastLoginAt: string
  status: "active" | "disabled" | "suspended"
  totalSpent: number
  currentUsage: {
    sandboxes: number
    apiKeys: number
    projects: number
  }
}

export class UserService {
  static API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  static async signup({ name, email, password }: { name: string; email: string; password: string }) {
    const res = await fetch(`${this.API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return await res.json();
  }

  static async signin(email: string, password: string) {
    const res = await fetch(`${this.API_BASE}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("auth-token", data.access_token);
      
              // Check if account is suspended
        if (data.account_suspended) {
          localStorage.setItem("user-data", JSON.stringify({
            ...data.user,
            account_name: data.account_name
          }));
          // Redirect to account suspended page and replace history
          if (typeof window !== "undefined") {
            window.location.replace("/account-suspended");
          }
          return data;
        }
        
        // For active accounts, enable auto-signin and redirect to dashboard
        if (typeof window !== "undefined") {
          localStorage.removeItem("auto-signin-disabled"); // Enable auto-signin
          window.location.replace("/dashboard");
        }
      
      // Optionally fetch user profile here
    }
    return data;
  }

  static async resendVerification(email: string) {
    const res = await fetch(`${this.API_BASE}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  }

  static async verifyEmail(code: string, email: string) {
    const res = await fetch(`${this.API_BASE}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: code }),
    });
    return await res.json();
  }

  static async resetPassword(email: string) {
    const res = await fetch(`${this.API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  }

  static async resetPasswordConfirm(token: string, newPassword: string) {
    const res = await fetch(`${this.API_BASE}/api/auth/reset-password/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return await res.json();
  }

  static async validateResetToken(token: string) {
    const res = await fetch(`${this.API_BASE}/api/auth/reset-password/validate/${token}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  }

  static async cleanupFailedSignup(email: string) {
    const res = await fetch(`${this.API_BASE}/api/users/cleanup-failed-signup?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  }

  static logout(): void {
    localStorage.removeItem("auth-token");
  }

  // Optionally, implement getCurrentUser by calling a /users/me endpoint with the JWT
  static async getCurrentUser() {
    const token = localStorage.getItem("auth-token");
    if (!token) return null;
    const res = await fetch(`${this.API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      // Clear invalid token
      localStorage.removeItem("auth-token");
      localStorage.removeItem("user-data");
      return null;
    }
    if (res.status === 403) {
      // Check if it's an account suspension
      const errorData = await res.json();
      if (errorData.account_suspended) {
        // Store suspended account info
        localStorage.setItem("user-data", JSON.stringify({
          account_suspended: true,
          account_name: errorData.account_name || "Unknown Account"
        }));
        // Dispatch account suspended event
        if (typeof window !== "undefined") {
          window.location.replace("/account-suspended");
        }
        return null;
      }
    }
    if (!res.ok) return null;
    const data = await res.json();
    // Store user data for admin detection
    localStorage.setItem("user-data", JSON.stringify(data));
    return data;
  }
}
