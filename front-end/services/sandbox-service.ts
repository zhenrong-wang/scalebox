import type { Sandbox } from "../types/sandbox"

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

export class SandboxService {
  // Get all sandboxes for the current user
  static async listSandboxes(params?: {
    status?: string
    framework?: string
    region?: string
    visibility?: string
    project_id?: string
    search?: string
    sort_by?: string
    sort_order?: string
    limit?: number
    offset?: number
  }): Promise<Sandbox[]> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await fetch(`${API_BASE_URL}/sandboxes/?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await handleResponse(response)
    return data.map((sandbox: any) => this.mapApiResponseToSandbox(sandbox))
  }

  // Get sandbox statistics
  static async getSandboxStats(): Promise<{
    total_sandboxes: number
    running_sandboxes: number
    stopped_sandboxes: number
    error_sandboxes: number
    deleted_sandboxes: number
    total_cost: number
    avg_cpu_usage: number
    avg_memory_usage: number
    total_uptime_hours: number
  }> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse(response)
  }

  // Create a new sandbox
  static async createSandbox(sandboxData: {
    name: string
    description?: string
    framework: string
    region: string
    visibility?: 'public' | 'private'
    project_id?: string
  }): Promise<Sandbox> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sandboxData),
    })

    const data = await handleResponse(response)
    return this.mapApiResponseToSandbox(data)
  }

  // Get a specific sandbox
  static async getSandbox(sandboxId: string): Promise<Sandbox> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/${sandboxId}`, {
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
    status?: 'running' | 'stopped' | 'error' | 'deleted'
    visibility?: 'public' | 'private'
    project_id?: string
  }): Promise<Sandbox> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/${sandboxId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    })

    const data = await handleResponse(response)
    return this.mapApiResponseToSandbox(data)
  }

  // Delete a sandbox
  static async deleteSandbox(sandboxId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/${sandboxId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    await handleResponse(response)
  }

  // Start a sandbox
  static async startSandbox(sandboxId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/${sandboxId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    await handleResponse(response)
  }

  // Stop a sandbox
  static async stopSandbox(sandboxId: string): Promise<{ cost_increment: number }> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/${sandboxId}/stop`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    return handleResponse(response)
  }

  // Admin: Get all sandboxes (admin only)
  static async getAllSandboxes(params?: {
    status?: string
    framework?: string
    region?: string
    visibility?: string
    user_id?: string
    project_id?: string
    search?: string
    sort_by?: string
    sort_order?: string
    limit?: number
    offset?: number
  }): Promise<Sandbox[]> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await fetch(`${API_BASE_URL}/sandboxes/admin/all?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const data = await handleResponse(response)
    return data.map((sandbox: any) => this.mapApiResponseToSandbox(sandbox))
  }

  // Admin: Get sandbox statistics (admin only)
  static async getAdminSandboxStats(): Promise<{
    total_sandboxes: number
    running_sandboxes: number
    stopped_sandboxes: number
    error_sandboxes: number
    deleted_sandboxes: number
    total_cost: number
    avg_cpu_usage: number
    avg_memory_usage: number
    total_uptime_hours: number
  }> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/admin/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    return handleResponse(response)
  }

  // Admin: Perform action on sandbox (admin only)
  static async adminSandboxAction(
    sandboxId: string, 
    action: 'start' | 'stop' | 'delete', 
    reason?: string
  ): Promise<{
    message: string
    sandbox_id: string
    action: string
    reason?: string
    user_email: string
  }> {
    const response = await fetch(`${API_BASE_URL}/sandboxes/admin/${sandboxId}/action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, reason }),
    })

    return handleResponse(response)
  }

  // Helper function to map API response to Sandbox interface
  private static mapApiResponseToSandbox(apiData: any): Sandbox {
    return {
      id: apiData.id,
      name: apiData.name,
      description: apiData.description || '',
      framework: apiData.framework,
      status: apiData.status,
      userId: apiData.user_id,
      userName: apiData.user_name,
      userEmail: apiData.user_email,
      region: apiData.region,
      visibility: apiData.visibility,
      resources: {
        cpu: apiData.resources.cpu || 0,
        memory: apiData.resources.memory || 0,
        storage: apiData.resources.storage || 0,
        bandwidth: apiData.resources.bandwidth || 0,
      },
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
    // This method is deprecated, use the async version instead
    console.warn('deleteSandboxLegacy() is deprecated. Use deleteSandbox(id) instead.')
  }

  // Utility methods for UI
  static getStatusBadge(sandbox: Sandbox) {
    const variants = {
      running: "default",
      stopped: "secondary",
      deleted: "destructive",
      error: "destructive",
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
