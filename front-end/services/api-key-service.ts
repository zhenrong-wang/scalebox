interface ApiKey {
  id: number;
  key_id: string;
  name: string;
  prefix: string;
  permissions?: Record<string, any>;
  is_active: boolean;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

interface CreateApiKeyRequest {
  name: string;
  permissions?: Record<string, any>;
  expires_in_days?: number;
}

interface UpdateApiKeyRequest {
  name?: string;
  permissions?: Record<string, any>;
  is_active?: boolean;
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

export class ApiKeyService {
  static API_BASE = "http://localhost:8000";

  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth-token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  }

  static async createApiKey(request: CreateApiKeyRequest): Promise<{ message: string; api_key: string; key_id: string; prefix: string; expires_at?: string }> {
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

  // Utility functions
  static formatApiKey(apiKey: string): string {
    // Show only the prefix for security
    return apiKey.substring(0, 16) + "...";
  }

  static isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  static getStatusBadge(apiKey: ApiKey): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (!apiKey.is_active) {
      return { text: "Inactive", variant: "destructive" };
    }
    if (this.isExpired(apiKey.expires_at)) {
      return { text: "Expired", variant: "destructive" };
    }
    return { text: "Active", variant: "default" };
  }

  static getPermissionsText(permissions?: Record<string, any>): string {
    if (!permissions || Object.keys(permissions).length === 0) {
      return "Full access";
    }
    return Object.keys(permissions).join(", ");
  }
} 