// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
// Import Sandbox type
import type { Sandbox } from '../types/sandbox'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth-token')
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  }
}

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    // Clear any existing auth token
    localStorage.removeItem('auth-token');
    // Set auth state to signin by dispatching a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-required'));
    }
    throw new Error('Authentication required. Please log in.');
  }
  if (response.status === 403) {
    // Check if it's an account suspension
    const errorData = await response.json().catch(() => ({}));
          if (errorData.account_suspended) {
        // Store suspended account info
        localStorage.setItem("user-data", JSON.stringify({
          account_suspended: true,
          account_name: errorData.account_name || "Unknown Account"
        }));
        // Redirect to suspension page and replace history
        if (typeof window !== "undefined") {
          window.location.replace("/account-suspended");
        }
        throw new Error('Account is suspended');
      }
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export interface Project {
  project_id: string;
  name: string;
  description?: string;
  owner_user_id: string;
  sandbox_count: number;
  api_key_count: number;
  total_spent: number;
  status: 'active' | 'archived';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

export class ProjectService {
  private baseUrl = `${API_BASE_URL}/api/projects`;

  async getProjects(skip: number = 0, limit: number = 50, status?: string): Promise<ProjectListResponse> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseUrl}/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async createProject(data: ProjectCreate): Promise<Project> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  }

  async updateProject(id: string, data: ProjectUpdate): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  }

  async deleteProject(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async archiveProject(id: string): Promise<Project> {
    return this.updateProject(id, { status: 'archived' });
  }

  async activateProject(id: string): Promise<Project> {
    return this.updateProject(id, { status: 'active' });
  }

  // Sandbox management methods
  async getProjectSandboxes(projectId: string, skip: number = 0, limit: number = 50, status?: string): Promise<Sandbox[]> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseUrl}/${projectId}/sandboxes?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async evictSandboxFromProject(projectId: string, sandboxId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${projectId}/sandboxes/${sandboxId}/evict`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async addSandboxToProject(projectId: string, sandboxId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${projectId}/sandboxes/${sandboxId}/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }
} 