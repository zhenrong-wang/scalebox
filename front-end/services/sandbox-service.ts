import type { Sandbox } from "../types/sandbox"

// Mock sandbox data
const mockSandboxes: Sandbox[] = [
  {
    id: "sb_001",
    name: "React Development Environment",
    description: "Main development environment for React application",
    framework: "React",
    status: "running",
    userId: "user_001",
    userName: "John Developer",
    userEmail: "john@company.com",
    region: "us-east-1",
    visibility: "private",
    resources: {
      cpu: 45,
      memory: 62,
      storage: 2.3,
      bandwidth: 1.2,
    },
    cost: {
      hourlyRate: 0.15,
      totalCost: 23.45,
    },
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-28T14:22:00Z",
    lastAccessedAt: "2024-01-28T14:22:00Z",
    uptime: 1250,
  },
  {
    id: "sb_002",
    name: "Node.js API Server",
    description: "Backend API development environment",
    framework: "Node.js",
    status: "running",
    userId: "user_002",
    userName: "Sarah Tech",
    userEmail: "sarah@startup.io",
    region: "us-west-2",
    visibility: "private",
    resources: {
      cpu: 78,
      memory: 85,
      storage: 4.1,
      bandwidth: 2.8,
    },
    cost: {
      hourlyRate: 0.25,
      totalCost: 45.67,
    },
    createdAt: "2024-01-20T09:15:00Z",
    updatedAt: "2024-01-28T16:45:00Z",
    lastAccessedAt: "2024-01-28T16:45:00Z",
    uptime: 2100,
  },
  {
    id: "sb_003",
    name: "Python Data Analysis",
    description: "Data science and machine learning environment",
    framework: "Python",
    status: "stopped",
    userId: "user_003",
    userName: "Mike Builder",
    userEmail: "mike@agency.com",
    region: "eu-west-1",
    visibility: "public",
    resources: {
      cpu: 0,
      memory: 0,
      storage: 8.5,
      bandwidth: 0.1,
    },
    cost: {
      hourlyRate: 0.35,
      totalCost: 67.89,
    },
    createdAt: "2024-01-10T14:20:00Z",
    updatedAt: "2024-01-25T11:30:00Z",
    lastAccessedAt: "2024-01-25T11:30:00Z",
    uptime: 0,
  },
  {
    id: "sb_004",
    name: "Vue.js Frontend",
    description: "Frontend development with Vue.js framework",
    framework: "Vue",
    status: "running",
    userId: "user_004",
    userName: "Lisa Coder",
    userEmail: "lisa@freelance.dev",
    region: "ap-southeast-1",
    visibility: "private",
    resources: {
      cpu: 32,
      memory: 48,
      storage: 1.8,
      bandwidth: 0.9,
    },
    cost: {
      hourlyRate: 0.12,
      totalCost: 18.34,
    },
    createdAt: "2024-01-22T08:45:00Z",
    updatedAt: "2024-01-28T12:15:00Z",
    lastAccessedAt: "2024-01-28T12:15:00Z",
    uptime: 890,
  },
  {
    id: "sb_005",
    name: "Angular Enterprise App",
    description: "Large-scale Angular application development",
    framework: "Angular",
    status: "error",
    userId: "user_001",
    userName: "John Developer",
    userEmail: "john@company.com",
    region: "us-east-1",
    visibility: "private",
    resources: {
      cpu: 0,
      memory: 0,
      storage: 0,
      bandwidth: 0,
    },
    cost: {
      hourlyRate: 0.2,
      totalCost: 0,
    },
    createdAt: "2024-01-30T10:00:00Z",
    updatedAt: "2024-01-30T10:00:00Z",
    lastAccessedAt: "2024-01-30T10:00:00Z",
    uptime: 0,
  },
]

export class SandboxService {
  static getAllSandboxes(): Sandbox[] {
    return mockSandboxes
  }

  static addSandbox(sandbox: Sandbox): void {
    mockSandboxes.push(sandbox)
  }

  static updateSandbox(id: string, data: Partial<Sandbox>): void {
    const idx = mockSandboxes.findIndex((sb) => sb.id === id)
    if (idx !== -1) {
      mockSandboxes[idx] = { ...mockSandboxes[idx], ...data }
    }
  }

  static deleteSandbox(id: string): void {
    const idx = mockSandboxes.findIndex((sb) => sb.id === id)
    if (idx !== -1) {
      mockSandboxes.splice(idx, 1)
    }
  }
}
