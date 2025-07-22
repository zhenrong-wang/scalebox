const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  user_id: string;
  username: string;
  display_name?: string;
  description?: string;
  is_active: boolean;
  is_root_user: boolean;
  is_verified: boolean;
  is_first_time_login: boolean;
  dedicated_signin_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  username: string;
  display_name?: string;
  description?: string;
}

export interface UpdateUserRequest {
  display_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

class UserManagementService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getUsers(skip: number = 0, limit: number = 50): Promise<UserListResponse> {
    const response = await fetch(`${API_BASE}/api/user-management/users?skip=${skip}&limit=${limit}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE}/api/user-management/users/${userId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    return response.json();
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE}/api/user-management/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create user: ${response.statusText}`);
    }

    return response.json();
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE}/api/user-management/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update user: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/user-management/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to delete user: ${response.statusText}`);
    }
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/user-management/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to change password: ${response.statusText}`);
    }

    return response.json();
  }

  async resetUserPassword(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/user-management/users/${userId}/reset-password`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required');
      }
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to reset user password: ${response.statusText}`);
    }

    return response.json();
  }
}

export const userManagementService = new UserManagementService(); 