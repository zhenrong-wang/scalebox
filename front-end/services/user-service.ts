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
    const res = await fetch(`${this.API_BASE}/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return await res.json();
  }

  static async signin(email: string, password: string) {
    const res = await fetch(`${this.API_BASE}/users/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("auth-token", data.access_token);
      // Optionally fetch user profile here
    }
    return data;
  }

  static async resendVerification(email: string) {
    const res = await fetch(`${this.API_BASE}/users/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  }

  static async verifyEmail(code: string, email: string) {
    const res = await fetch(`${this.API_BASE}/users/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: code }),
    });
    return await res.json();
  }

  static async resetPassword(email: string) {
    const res = await fetch(`${this.API_BASE}/users/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  }

  static async resetPasswordConfirm(token: string, newPassword: string) {
    const res = await fetch(`${this.API_BASE}/users/reset-password/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return await res.json();
  }

  static async validateResetToken(token: string) {
    const res = await fetch(`${this.API_BASE}/users/reset-password/validate/${token}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  }

  static async cleanupFailedSignup(email: string) {
    const res = await fetch(`${this.API_BASE}/users/cleanup-failed-signup?email=${encodeURIComponent(email)}`, {
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
    const res = await fetch(`${this.API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Store user data for admin detection
    localStorage.setItem("user-data", JSON.stringify(data));
    return data;
  }
}
