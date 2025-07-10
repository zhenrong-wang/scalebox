interface ApiKey {
  id: number;
  key_id: string;
  name: string;
  description?: string; // New description field
  prefix: string;
  permissions: { read: true; write: boolean };
  is_active: boolean;
  expires_in_days?: number; // Changed from expires_at to expires_in_days
  last_used_at?: string;
  created_at: string;
  user_email?: string; // for admin
}

interface CreateApiKeyRequest {
  name: string;
  description?: string; // New description field
  can_write: boolean;
  expires_in_days?: number; // Changed from expires_at to expires_in_days
}

interface UpdateApiKeyRequest {
  name?: string;
  description?: string; // New description field
  can_write?: boolean;
  expires_in_days?: number; // Allow updating expiration
}

interface ApiKeyUsage {
  id: number;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms?: number;
  ip_address?: string;
  created_at: string;
}

interface ApiKeyStats {
  total_keys: number;
  active_keys: number;
  expired_keys: number;
  usage_last_30_days: number;
}

export type { ApiKey };
export class ApiKeyService {
  static API_BASE = "http://localhost:8000";

  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth-token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  }

  static async createApiKey(request: CreateApiKeyRequest): Promise<{ message: string; api_key: string; key_id: string; prefix: string }> {
    const response = await fetch(`${this.API_BASE}/api-keys/`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to create API key");
    }

    return await response.json();
  }

  static async listApiKeys(): Promise<ApiKey[]> {
    const response = await fetch(`${this.API_BASE}/api-keys/`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch API keys");
    }

    return await response.json();
  }

  static async getApiKey(keyId: string): Promise<ApiKey> {
    const response = await fetch(`${this.API_BASE}/api-keys/${keyId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch API key");
    }

    return await response.json();
  }

  static async updateApiKey(keyId: string, request: UpdateApiKeyRequest): Promise<ApiKey> {
    const response = await fetch(`${this.API_BASE}/api-keys/${keyId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update API key");
    }

    return await response.json();
  }

  static async deleteApiKey(keyId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_BASE}/api-keys/${keyId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to delete API key");
    }

    return await response.json();
  }

  static async toggleApiKeyStatus(keyId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_BASE}/api-keys/${keyId}/toggle`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to toggle API key status");
    }

    return await response.json();
  }

  static async getApiKeyUsage(keyId: string, limit: number = 100): Promise<ApiKeyUsage[]> {
    const response = await fetch(`${this.API_BASE}/api-keys/${keyId}/usage?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch API key usage");
    }

    return await response.json();
  }

  // Admin endpoints
  static async getAllApiKeys(): Promise<ApiKey[]> {
    const response = await fetch(`${this.API_BASE}/api-keys/admin/all`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch all API keys");
    }

    return await response.json();
  }

  static async getApiKeyStats(): Promise<ApiKeyStats> {
    const response = await fetch(`${this.API_BASE}/api-keys/admin/stats`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to fetch API key stats");
    }

    return await response.json();
  }

  static async adminApiKeyAction(keyId: string, action: "enable" | "disable" | "delete", reason?: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_BASE}/api-keys/admin/${keyId}/action`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ action, reason }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `Failed to ${action} API key`);
    }
    return await response.json();
  }

  // Utility functions
  static formatApiKey(apiKey: string): string {
    // Show only the prefix for security
    return apiKey.substring(0, 16) + "...";
  }

  static isExpired(expiresInDays?: number, createdAt?: string): boolean {
    if (!expiresInDays || !createdAt) return false;
    const created = new Date(createdAt);
    const expirationDate = new Date(created.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    return new Date() > expirationDate;
  }

  static getDaysUntilExpiration(expiresInDays?: number, createdAt?: string): number | null {
    if (!expiresInDays || !createdAt) return null;
    const created = new Date(createdAt);
    const expirationDate = new Date(created.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  static getStatusBadge(apiKey: ApiKey): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (!apiKey.is_active) {
      return { text: "Inactive", variant: "destructive" };
    }
    if (this.isExpired(apiKey.expires_in_days, apiKey.created_at)) {
      return { text: "Expired", variant: "destructive" };
    }
    return { text: "Active", variant: "default" };
  }

  static getPermissionsText(permissions: { read: true; write: boolean }, t?: (key: string, params?: any) => string): string {
    if (permissions.write) return t ? (t("apiKey.readWrite") || "Read & Write") : "Read & Write";
    return t ? (t("apiKey.readOnly") || "Read Only") : "Read Only";
  }

  static getExpirationText(expiresInDays?: number, createdAt?: string, t?: (key: string, params?: any) => string): string {
    if (!expiresInDays) return t ? (t("apiKey.permanent") || "Permanent") : "Permanent";
    const daysLeft = this.getDaysUntilExpiration(expiresInDays, createdAt);
    if (daysLeft === null) return t ? (t("apiKey.permanent") || "Permanent") : "Permanent";
    if (daysLeft === 0) return t ? (t("apiKey.expiresToday") || "Expires today") : "Expires today";
    if (daysLeft < 0) return t ? (t("apiKey.expired") || "Expired") : "Expired";
    return t ? (t("apiKey.expiresIn", { days: daysLeft }) || `Expires in ${daysLeft} days`) : `Expires in ${daysLeft} days`;
  }
} 