interface ApiKey {
  id: number;
  key_id: string;
  name: string;
  description?: string;
  prefix: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  user_email?: string; // for admin
}

interface CreateApiKeyRequest {
  name: string;
  description?: string;
}

interface UpdateApiKeyRequest {
  name?: string;
  description?: string;
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
  static API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth-token");
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };
  }

  private static async handleResponse(response: Response) {
    if (response.status === 401) {
      // Clear any existing auth token
      localStorage.removeItem('auth-token');
      // Set auth state to signin by dispatching a custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-required'));
      }
      throw new Error('Authentication required. Please log in.');
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  static async createApiKey(request: CreateApiKeyRequest): Promise<{ message: string; api_key: string; key_id: string; prefix: string }> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return await this.handleResponse(response);
  }

  static async listApiKeys(): Promise<ApiKey[]> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/`, {
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse(response);
    return data.api_keys || [];
  }

  static async getApiKey(keyId: string): Promise<ApiKey> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/${keyId}`, {
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  static async updateApiKey(keyId: string, request: UpdateApiKeyRequest): Promise<ApiKey> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/${keyId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return await this.handleResponse(response);
  }

  static async deleteApiKey(keyId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/${keyId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  static async updateApiKeyStatus(keyId: string, isActive: boolean): Promise<{ message: string; is_active: boolean }> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/${keyId}/status`, {
      method: "PATCH",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: isActive }),
    });

    return await this.handleResponse(response);
  }

  // Convenience methods for enable/disable
  static async enableApiKey(keyId: string): Promise<{ message: string; is_active: boolean }> {
    return this.updateApiKeyStatus(keyId, true);
  }

  static async disableApiKey(keyId: string): Promise<{ message: string; is_active: boolean }> {
    return this.updateApiKeyStatus(keyId, false);
  }





  static async getApiKeyUsage(keyId: string, limit: number = 100): Promise<ApiKeyUsage[]> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/${keyId}/usage?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  // Admin endpoints
  static async getAllApiKeys(): Promise<ApiKey[]> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/admin/all`, {
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  static async getApiKeyStats(): Promise<ApiKeyStats> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/admin/stats`, {
      headers: this.getAuthHeaders(),
    });

    return await this.handleResponse(response);
  }

  static async adminApiKeyAction(keyId: string, action: "enable" | "disable" | "delete", reason?: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_BASE}/api/api-keys/admin/${keyId}/action`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ action, reason }),
    });
    return await this.handleResponse(response);
  }

  // Utility functions
  static formatApiKey(apiKey: string): string {
    // Show only the prefix for security
    return apiKey.substring(0, 16) + "...";
  }

  static getStatusBadge(apiKey: ApiKey): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (!apiKey.is_active) {
      return { text: "Disabled", variant: "destructive" };
    }
    return { text: "Active", variant: "default" };
  }
} 