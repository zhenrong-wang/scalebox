export interface AdminUser {
  id: string
  name: string
  email: string
  status: "active" | "disabled" | "suspended"
  role: "user" | "admin"
  createdAt: string
  lastLoginAt: string
  totalSpent: number
  currentUsage: {
    sandboxes: number
    apiKeys: number
    projects: number
  }
}

export interface UserProject {
  id: string
  name: string
  description: string
  user_account_id: string
  sandboxCount: number
  apiKeyCount: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export interface UserUsageStats {
  user_account_id: string
  userName: string
  userEmail: string
  totalRequests: number
  totalSpent: number
  sandboxHours: number
  apiCalls: number
  storageUsed: number
  projects: UserProject[]
  recentActivity: ActivityLog[]
}

export interface ActivityLog {
  id: string
  user_account_id: string
  action: string
  resource: string
  timestamp: string
  details: string
}
