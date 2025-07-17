export interface Sandbox {
  id: string
  name: string
  description: string
  status: "starting" | "running" | "stopped" | "timeout" | "archived"
  user_account_id: string
  userName: string
  userEmail: string
  region: string
  visibility: 'public' | 'private'
  template_id: string // Add this line for template reference
  template_name?: string // Name of the template
  project_id: string // Project this sandbox belongs to
  project_name: string // Name of the project
  resources: {
    cpu: number // percentage
    memory: number // percentage
    storage: number // GB
    bandwidth: number // GB
  }
  cpu_spec?: number // vCPU spec
  memory_spec?: number // GB spec
  cost: {
    hourlyRate: number
    totalCost: number
  }
  createdAt: string
  updatedAt: string
  lastAccessedAt?: string
  uptime: number // minutes
}

export interface SandboxFilters {
  status: string[]
  region: string[]
  user: string
  dateRange: {
    from: Date | null
    to: Date | null
  }
  search: string
}

export interface SandboxStats {
  total: number
  running: number
  stopped: number
  timeout: number
  archived: number
  totalCost: number
  avgCpuUsage: number
  avgMemoryUsage: number
  totalUptime: number
  topFrameworks: Array<{ framework: string; count: number }>
  topUsers: Array<{ user: string; count: number }>
  regionDistribution: Array<{ region: string; count: number }>
}
