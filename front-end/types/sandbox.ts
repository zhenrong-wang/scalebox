export interface Sandbox {
  id: string
  name: string
  description: string
  framework: string
  status: "running" | "stopped" | "deleted" | "error"
  userId: string
  userName: string
  userEmail: string
  region: string
  visibility: "public" | "private"
  resources: {
    cpu: number // percentage
    memory: number // percentage
    storage: number // GB
    bandwidth: number // GB
  }
  cost: {
    hourlyRate: number
    totalCost: number
  }
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
  uptime: number // minutes
}

export interface SandboxFilters {
  status: string[]
  framework: string[]
  region: string[]
  visibility: string[]
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
  deleted: number
  error: number
  totalCost: number
  avgCpuUsage: number
  avgMemoryUsage: number
  totalUptime: number
  topFrameworks: Array<{ framework: string; count: number }>
  topUsers: Array<{ userId: string; userName: string; count: number; cost: number }>
  regionDistribution: Array<{ region: string; count: number }>
}
