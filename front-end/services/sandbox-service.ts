import type { Sandbox } from "../types/sandbox"

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth-token')
  return !!token
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth-token')
  if (!token) {
    console.warn('No auth token found in localStorage')
  }
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

export class SandboxService {
  // Get all sandboxes for the current user
  static async listSandboxes(params?: {
    status?: string
    region?: string
    visibility?: string
    project_id?: string
    search?: string
    sort_by?: string
    sort_order?: string
    limit?: number
    offset?: number
  }): Promise<Sandbox[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(`${API_BASE_URL}/api/sandboxes/?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      const data = await handleResponse(response)
      return data.map((sandbox: any) => this.mapApiResponseToSandbox(sandbox))
    } catch (error) {
      console.error('Failed to fetch sandboxes:', error)
      // Return empty array if the request fails
      return []
    }
  }

  // Get sandbox statistics
  static async getSandboxStats(): Promise<{
    total_sandboxes: number
    running_sandboxes: number
    stopped_sandboxes: number
    timeout_sandboxes: number
    archived_sandboxes: number
    total_cost: number
    avg_cpu_usage: number
    avg_memory_usage: number
    total_uptime_hours: number
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sandboxes/stats`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      return handleResponse(response)
    } catch (error) {
      console.error('Failed to fetch sandbox stats:', error)
      // Return default stats if the request fails
      return {
        total_sandboxes: 0,
        running_sandboxes: 0,
        stopped_sandboxes: 0,
        timeout_sandboxes: 0,
        archived_sandboxes: 0,
        total_cost: 0,
        avg_cpu_usage: 0,
        avg_memory_usage: 0,
        total_uptime_hours: 0,
      }
    }
  }

  // Create a new sandbox
  static async createSandbox(sandboxData: {
    name: string
    description?: string
    region: string
    visibility?: 'public' | 'private'
    project_id?: string
  }): Promise<Sandbox> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sandboxData),
    })

    const data = await handleResponse(response)
    return this.mapApiResponseToSandbox(data)
  }

  // Get a specific sandbox
  static async getSandbox(sandboxId: string): Promise<Sandbox> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/${sandboxId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await handleResponse(response)
    return this.mapApiResponseToSandbox(data)
  }

  // Update a sandbox
  static async updateSandbox(sandboxId: string, updateData: {
    name?: string
    description?: string
    status?: 'running' | 'stopped' | 'timeout' | 'archived'
    visibility?: 'public' | 'private'
    project_id?: string
  }): Promise<Sandbox> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/${sandboxId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    })

    const data = await handleResponse(response)
    return this.mapApiResponseToSandbox(data)
  }

  // Stop a sandbox
  static async stopSandbox(sandboxId: string): Promise<{ cost_increment: number }> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/${sandboxId}/stop`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    return handleResponse(response)
  }

  // Start a sandbox
  static async startSandbox(sandboxId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/${sandboxId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    await handleResponse(response)
  }

  // Switch sandbox to a different project
  static async switchSandboxProject(sandboxId: string, projectId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/${sandboxId}/switch-project`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ project_id: projectId }),
    })

    return handleResponse(response)
  }

  // Admin endpoints
  static async getAllSandboxes(params?: {
    status?: string
    owner_account_id?: string
    project_id?: string
    search?: string
    sort_by?: string
    sort_order?: string
    limit?: number
    offset?: number
  }): Promise<Sandbox[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString())
          }
        })
      }

      const response = await fetch(`${API_BASE_URL}/api/sandboxes/admin/all?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      const data = await handleResponse(response)
      return data.map((sandbox: any) => this.mapApiResponseToSandbox(sandbox))
    } catch (error) {
      console.error('Failed to fetch all sandboxes:', error)
      return []
    }
  }

  // Get admin sandbox statistics
  static async getAdminSandboxStats(): Promise<{
    total_sandboxes: number
    running_sandboxes: number
    stopped_sandboxes: number
    timeout_sandboxes: number
    archived_sandboxes: number
    total_cost: number
    avg_cpu_usage: number
    avg_memory_usage: number
    total_uptime_hours: number
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sandboxes/admin/stats`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })

      return handleResponse(response)
    } catch (error) {
      console.error('Failed to fetch admin sandbox stats:', error)
      return {
        total_sandboxes: 0,
        running_sandboxes: 0,
        stopped_sandboxes: 0,
        timeout_sandboxes: 0,
        archived_sandboxes: 0,
        total_cost: 0,
        avg_cpu_usage: 0,
        avg_memory_usage: 0,
        total_uptime_hours: 0,
      }
    }
  }

  // Admin action on sandbox
  static async adminActionOnSandbox(sandboxId: string, action: 'start' | 'stop' | 'archive'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/admin/${sandboxId}/action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
    })

    await handleResponse(response)
  }

  // Get sandbox metrics
  static async getSandboxMetrics(sandboxId: string, params: { start_date?: string; end_date?: string } = {}): Promise<any> {
    const queryParams = new URLSearchParams(params as Record<string, string>)
    const response = await fetch(`${API_BASE_URL}/api/sandboxes/${sandboxId}/metrics?${queryParams.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse(response)
  }

  // Search sandboxes
  static async searchSandboxes(query: string, filters?: { status?: string; region?: string }): Promise<Sandbox[]> {
    const queryParams = new URLSearchParams({ search: query })
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })
    }

    const response = await fetch(`${API_BASE_URL}/api/sandboxes/?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await handleResponse(response)
    return data.map((sandbox: any) => this.mapApiResponseToSandbox(sandbox))
  }

  // Get all sandboxes for a specific project
  static async getSandboxesByProject(projectId: string): Promise<Sandbox[]> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('project_id', projectId)
      const response = await fetch(`${API_BASE_URL}/api/sandboxes/?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      })
      const data = await handleResponse(response)
      return data.map((sandbox: any) => this.mapApiResponseToSandbox(sandbox))
    } catch (error) {
      console.error('Failed to fetch sandboxes by project:', error)
      return []
    }
  }

  // Helper function to map API response to Sandbox interface
  private static mapApiResponseToSandbox(apiData: any): Sandbox {
    return {
      id: apiData.id,
      name: apiData.name,
      description: apiData.description || '',
      status: apiData.status,
      user_account_id: apiData.user_account_id,
      userName: apiData.user_name,
      userEmail: apiData.user_email,
      region: apiData.region,
      visibility: apiData.visibility,
      template_id: apiData.template_id || '',
      template_name: apiData.template_name || '',
      project_id: apiData.project_id || '',
      project_name: apiData.project_name || '',
      resources: {
        cpu: apiData.resources.cpu || 0,
        memory: apiData.resources.memory || 0,
        storage: apiData.resources.storage || 0,
        bandwidth: apiData.resources.bandwidth || 0,
      },
      cpu_spec: apiData.cpu_spec,
      memory_spec: apiData.memory_spec,
      cost: {
        hourlyRate: apiData.cost.hourlyRate || 0,
        totalCost: apiData.cost.totalCost || 0,
      },
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
      lastAccessedAt: apiData.last_accessed_at,
      uptime: apiData.uptime || 0,
    }
  }

  // Legacy methods for backward compatibility (now use real API)
  static getAllSandboxesLegacy(): Sandbox[] {
    // This method is deprecated, use the async version instead
    console.warn('getAllSandboxesLegacy() is deprecated. Use getAllSandboxes(params?) instead.')
    return []
  }

  static addSandboxLegacy(sandbox: Sandbox): void {
    // This method is deprecated, use the async version instead
    console.warn('addSandboxLegacy() is deprecated. Use createSandbox(data) instead.')
  }

  static updateSandboxLegacy(id: string, data: Partial<Sandbox>): void {
    // This method is deprecated, use the async version instead
    console.warn('updateSandboxLegacy() is deprecated. Use updateSandbox(id, data) instead.')
  }

  static deleteSandboxLegacy(id: string): void {
    console.warn('deleteSandboxLegacy() is deprecated. Sandbox deletion is not supported.')
  }

  // Utility methods for UI
  static getStatusBadge(sandbox: Sandbox) {
    const variants = {
      running: "default",
      stopped: "secondary",
      archived: "destructive",
      starting: "default",
      timeout: "destructive",
    } as const

    return {
      variant: variants[sandbox.status],
      text: sandbox.status.charAt(0).toUpperCase() + sandbox.status.slice(1)
    }
  }

  static getExpirationText(expiresInDays: number, createdAt: string, t: (key: string, vars?: any) => string) {
    if (!expiresInDays) return t("apiKey.permanent") || "Permanent"
    
    const createdDate = new Date(createdAt)
    const expirationDate = new Date(createdDate.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
    const now = new Date()
    
    if (expirationDate <= now) {
      return t("apiKey.expired") || "Expired"
    }
    
    const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return t("apiKey.expiresIn", { days: daysLeft }) || `Expires in ${daysLeft} days`
  }

  static getPermissionsText(permissions: any, t: (key: string, vars?: any) => string) {
    if (!permissions) return t("apiKey.noPermissions") || "No permissions"
    
    const parts = []
    if (permissions.read) parts.push(t("apiKey.read") || "Read")
    if (permissions.write) parts.push(t("apiKey.write") || "Write")
    
    return parts.length > 0 ? parts.join(", ") : t("apiKey.noPermissions") || "No permissions"
  }
}
