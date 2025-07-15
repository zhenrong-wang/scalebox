// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  language: string;
  cpu_spec: number;
  memory_spec: number;
  is_official: boolean;
  is_public: boolean;
  owner_id?: number;
  repository_url: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TemplateCreateRequest {
  name: string;
  description?: string;
  category: string;
  language: string;
  cpu_spec: number;
  memory_spec: number;
  is_official?: boolean;
  is_public?: boolean;
  repository_url: string;
  tags?: string[];
}

export interface TemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: string;
  language?: string;
  cpu_spec?: number;
  memory_spec?: number;
  is_public?: boolean;
  repository_url?: string;
  tags?: string[];
}

export interface TemplateListResponse {
  templates: Template[];
  total: number;
}

export interface TemplateFilters {
  category?: string;
  language?: string;
  is_official?: boolean;
  is_public?: boolean;
  skip?: number;
  limit?: number;
}

export class TemplateService {
  private baseUrl = `${API_BASE_URL}/api/templates`;

  async getTemplates(filters: TemplateFilters = {}): Promise<TemplateListResponse> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.language) params.append('language', filters.language);
    if (filters.is_official !== undefined) params.append('is_official', filters.is_official.toString());
    if (filters.is_public !== undefined) params.append('is_public', filters.is_public.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async getTemplate(id: string): Promise<Template> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async createTemplate(template: TemplateCreateRequest): Promise<Template> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(template),
    });

    return handleResponse(response);
  }

  async updateTemplate(id: string, template: TemplateUpdateRequest): Promise<Template> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(template),
    });

    return handleResponse(response);
  }

  async deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    await handleResponse(response);
  }

  // Admin endpoints
  async getAllTemplates(filters: TemplateFilters = {}): Promise<TemplateListResponse> {
    const params = new URLSearchParams();
    
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}/admin/all?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async makeTemplateOfficial(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/admin/${id}/make-official`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async makeTemplatePublic(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/admin/${id}/make-public`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  // Helper methods
  getRepositoryUrl(template: Template): string {
    return template.repository_url;
  }

  getTemplateType(template: Template): 'official' | 'public' | 'private' {
    if (template.is_official) return 'official';
    if (template.is_public) return 'public';
    return 'private';
  }

  canEdit(template: Template, currentUserId?: number, isAdmin?: boolean): boolean {
    if (isAdmin) return true;
    if (template.is_official) return false;
    return template.owner_id === currentUserId;
  }

  canDelete(template: Template, currentUserId?: number, isAdmin?: boolean): boolean {
    if (isAdmin) return true;
    if (template.is_official) return false;
    return template.owner_id === currentUserId;
  }

  canUse(template: Template, currentUserId?: number, isAdmin?: boolean): boolean {
    if (isAdmin) return true;
    if (template.is_official || template.is_public) return true;
    return template.owner_id === currentUserId;
  }
}

export const templateService = new TemplateService(); 