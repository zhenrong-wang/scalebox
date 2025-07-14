"use client"

import { useState, useEffect } from "react"
import { Search, Download, MoreHorizontal, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { ResizableTable, ResizableTableHead, ResizableTableCell } from "@/components/ui/resizable-table"
import { TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { UserDetailsModal } from "./user-details-modal"
import { useLanguage } from "../../contexts/language-context"

interface User {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  status: string;
  role: string;
  account_id?: string;
  currentUsage?: {
    projects: number;
    sandboxes: number;
    apiKeys: number;
  };
  totalSpent?: number;
  createdAt?: string;
  lastLoginAt?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    disabledUsers: 0,
    suspendedUsers: 0,
  });

  const { t } = useLanguage()

  // TODO: Replace with backend API calls for user management
  // Remove or comment out all UserService.getAllUsers, updateUser, deleteUser, etc.
  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('No access token found');
        // Check if user is already authenticated
        const userData = localStorage.getItem('user-data');
        if (!userData) {
          window.location.href = '/signin';
          return;
        }
        // User is authenticated but token is missing, try to refresh
        console.log('User authenticated but token missing, attempting to refresh...');
        return;
      }
      
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE}/users/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
        setFilteredUsers(userData);
      } else {
        console.error('Failed to load users:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('No access token found');
        // Check if user is already authenticated
        const userData = localStorage.getItem('user-data');
        if (!userData) {
          window.location.href = '/signin';
          return;
        }
        // User is authenticated but token is missing, try to refresh
        console.log('User authenticated but token missing, attempting to refresh...');
        return;
      }
      
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE}/users/admin/user-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      } else {
        console.error('Failed to load stats:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const refreshAll = async () => {
    await Promise.all([loadUsers(), loadStats()]);
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (user) =>
          (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter)
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter, roleFilter])

  useEffect(() => {
    loadStats();
  }, []);

  const handleStatusChange = async (userId: string, newStatus: "active" | "disabled" | "suspended") => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE}/users/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

             if (response.ok) {
         refreshAll(); // Reload users and stats to reflect status change
       } else {
        console.error('Failed to update user status:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm(t("admin.confirmDeleteUser"))) {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/users/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

                 if (response.ok) {
           refreshAll(); // Reload users and stats to reflect deletion
         } else {
          console.error('Failed to delete user:', response.statusText);
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "disabled":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : "bg-blue-100 text-blue-800 border-blue-200"
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeof stats.totalUsers === "number" && !isNaN(stats.totalUsers) ? stats.totalUsers : "0"}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{typeof stats.activeUsers === "number" && !isNaN(stats.activeUsers) ? stats.activeUsers : "0"}</span> {t("admin.activeUsers")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.activeUsers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{typeof stats.activeUsers === "number" && !isNaN(stats.activeUsers) ? stats.activeUsers : "0"}</div>
            <p className="text-xs text-muted-foreground">
              {typeof stats.totalUsers === "number" && stats.totalUsers > 0 && typeof stats.activeUsers === "number" && !isNaN(stats.activeUsers)
                ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                : 0}% {t("admin.ofTotal")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${typeof stats.totalRevenue === "number" && !isNaN(stats.totalRevenue) ? stats.totalRevenue.toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.fromAllUsers")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.issues")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{typeof stats.disabledUsers === "number" && !isNaN(stats.disabledUsers) && typeof stats.suspendedUsers === "number" && !isNaN(stats.suspendedUsers) ? stats.disabledUsers + stats.suspendedUsers : "0"}</div>
            <p className="text-xs text-muted-foreground">
              {typeof stats.disabledUsers === "number" && !isNaN(stats.disabledUsers) ? stats.disabledUsers : "0"} {t("admin.disabled")}, {typeof stats.suspendedUsers === "number" && !isNaN(stats.suspendedUsers) ? stats.suspendedUsers : "0"} {t("admin.suspended")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("admin.searchUsersByNameOrEmail")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">{t("admin.statusFilter")}</SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allStatus")}</SelectItem>
              <SelectItem value="active">{t("admin.active")}</SelectItem>
              <SelectItem value="disabled">{t("admin.disabled")}</SelectItem>
              <SelectItem value="suspended">{t("admin.suspended")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">{t("admin.roleFilter")}</SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
              <SelectItem value="user">{t("admin.user")}</SelectItem>
              <SelectItem value="admin">{t("admin.admin")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshAll} className="flex items-center gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            {t("admin.refresh")}
          </Button>
          <Button variant="outline" className="flex items-center gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            {t("admin.export")}
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.users")} ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ResizableTable
              defaultColumnWidths={{
                name: 200,
                accountId: 120,
                email: 200,
                role: 100,
                status: 100,
                usage: 120,
                totalSpent: 120,
                created: 120,
                lastLogin: 120,
                actions: 120
              }}
            >
              <TableHeader>
                <TableRow>
                  <ResizableTableHead columnId="name" defaultWidth={200}>{t("table.name")}</ResizableTableHead>
                  <ResizableTableHead columnId="accountId" defaultWidth={120}>Account ID</ResizableTableHead>
                  <ResizableTableHead columnId="email" defaultWidth={200}>{t("table.email")}</ResizableTableHead>
                  <ResizableTableHead columnId="role" defaultWidth={100}>{t("table.role")}</ResizableTableHead>
                  <ResizableTableHead columnId="status" defaultWidth={100}>{t("table.status")}</ResizableTableHead>
                  <ResizableTableHead columnId="usage" defaultWidth={120}>{t("table.usage")}</ResizableTableHead>
                  <ResizableTableHead columnId="totalSpent" defaultWidth={120}>{t("table.totalSpent")}</ResizableTableHead>
                  <ResizableTableHead columnId="created" defaultWidth={120}>{t("table.created")}</ResizableTableHead>
                  <ResizableTableHead columnId="lastLogin" defaultWidth={120}>{t("table.lastLogin")}</ResizableTableHead>
                  <ResizableTableHead columnId="actions" defaultWidth={120}>{t("table.actions")}</ResizableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers
                  .filter(user => user && typeof user === "object")
                  .map((user) => {
                    if (!user || typeof user !== "object") return null;
                    return (
                      <TableRow key={user.account_id}>
                    <ResizableTableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </ResizableTableCell>
                        <ResizableTableCell>
                          <div className="text-sm font-mono text-muted-foreground">
                            {user.account_id ? user.account_id.substring(0, 8) + '...' : '-'}
                          </div>
                        </ResizableTableCell>
                    <ResizableTableCell>
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <div className="text-sm">
                            <div>{user.currentUsage?.projects ?? 0} {t("admin.projects")}</div>
                            <div className="text-muted-foreground">{user.currentUsage?.sandboxes ?? 0} {t("admin.sandboxes")}</div>
                      </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                          <div className="font-medium">
                            ${user && !isNaN(Number(user.totalSpent)) ? Number(user.totalSpent).toFixed(2) : "0.00"}
                          </div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                          <div className="text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                          <div className="text-sm">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "-"}</div>
                    </ResizableTableCell>
                    <ResizableTableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedUser(user.account_id || user.id)}>{t("action.viewDetails")}</DropdownMenuItem>
                          {user.status === "active" && (
                            <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.account_id || user.id, "disabled")}>{t("admin.disableUser")}</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.account_id || user.id, "suspended")}>{t("admin.suspendUser")}</DropdownMenuItem>
                            </>
                          )}
                          {user.status !== "active" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(user.account_id || user.id, "active")}>{t("admin.activateUser")}</DropdownMenuItem>
                          )}
                              <DropdownMenuItem onClick={() => handleDeleteUser(user.account_id || user.id)} className="text-red-600">{t("action.deleteUser")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ResizableTableCell>
                  </TableRow>
                    );
                  })
                  .filter(Boolean)
                }
              </TableBody>
            </ResizableTable>
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && <UserDetailsModal userId={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}
