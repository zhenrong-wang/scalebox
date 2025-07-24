"use client"

import { useState, useEffect } from "react"
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, User, Building, Server, Key, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "../../contexts/language-context"
import { AccountDetailsModal } from "./account-details-modal"

interface Account {
  account_id: string;
  name: string;
  email: string;
  display_name: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  user_count: number;
  sandbox_count: number;
  project_count: number;
  api_key_count: number;
  total_spent: number;
}

export function AccountManagement() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalRevenue: 0,
    disabledAccounts: 0,
    verifiedAccounts: 0,
  });

  const { t } = useLanguage()

  const loadAccounts = async () => {
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
      const response = await fetch(`${API_BASE}/api/admin/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
        setFilteredAccounts(data.accounts || []);
      } else {
        console.error('Failed to load accounts:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
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
      const response = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setStats({
          totalAccounts: statsData.total_accounts || 0,
          activeAccounts: statsData.active_accounts || 0,
          totalRevenue: statsData.total_revenue || 0,
          disabledAccounts: (statsData.total_accounts || 0) - (statsData.active_accounts || 0),
          verifiedAccounts: statsData.total_accounts || 0, // TODO: Add verified count to backend
        });
      } else {
        console.error('Failed to load stats:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  const refreshAll = async () => {
    await Promise.all([loadAccounts(), loadStats()]);
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    let filtered = accounts

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (account) =>
          (account.name && account.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (account.email && account.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (account.display_name && account.display_name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((account) => 
        statusFilter === "active" ? account.is_active : !account.is_active
      )
    }

    if (planFilter !== "all") {
      filtered = filtered.filter((account) => account.subscription_plan === planFilter)
    }

    setFilteredAccounts(filtered)
  }, [accounts, searchTerm, statusFilter, planFilter])

  useEffect(() => {
    loadStats();
  }, []);

  const handleDisableAccount = async (accountId: string) => {
    if (confirm(t("admin.confirmDisableAccount"))) {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/admin/accounts/${accountId}/disable`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          refreshAll(); // Reload accounts and stats to reflect status change
        } else {
          console.error('Failed to disable account:', response.statusText);
        }
      } catch (error) {
        console.error('Error disabling account:', error);
      }
    }
  }

  const handleEnableAccount = async (accountId: string) => {
    if (confirm(t("admin.confirmEnableAccount"))) {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/admin/accounts/${accountId}/enable`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          refreshAll(); // Reload accounts and stats to reflect status change
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to enable account:', response.status, response.statusText, errorData);
          throw new Error(`Failed to enable account: ${errorData.error || response.statusText}`);
        }
      } catch (error) {
        console.error('Error enabling account:', error);
      }
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm(t("admin.confirmDeleteAccount"))) {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/admin/accounts/${accountId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          refreshAll(); // Reload accounts and stats to reflect deletion
        } else {
          console.error('Failed to delete account:', response.statusText);
        }
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200"
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "premium":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "pro":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "free":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalAccounts")}</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeof stats.totalAccounts === "number" && !isNaN(stats.totalAccounts) ? stats.totalAccounts : "0"}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{typeof stats.activeAccounts === "number" && !isNaN(stats.activeAccounts) ? stats.activeAccounts : "0"}</span> {t("admin.activeAccounts")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.activeAccounts")}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{typeof stats.activeAccounts === "number" && !isNaN(stats.activeAccounts) ? stats.activeAccounts : "0"}</div>
            <p className="text-xs text-muted-foreground">
              {typeof stats.totalAccounts === "number" && stats.totalAccounts > 0 && typeof stats.activeAccounts === "number" && !isNaN(stats.activeAccounts)
                ? Math.round((stats.activeAccounts / stats.totalAccounts) * 100)
                : 0}% {t("admin.ofTotal")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.totalRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${typeof stats.totalRevenue === "number" && !isNaN(stats.totalRevenue) ? stats.totalRevenue.toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.fromAllAccounts")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.disabledAccounts")}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{typeof stats.disabledAccounts === "number" && !isNaN(stats.disabledAccounts) ? stats.disabledAccounts : "0"}</div>
            <p className="text-xs text-muted-foreground">{t("admin.requiresAttention")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.verifiedAccounts")}</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{typeof stats.verifiedAccounts === "number" && !isNaN(stats.verifiedAccounts) ? stats.verifiedAccounts : "0"}</div>
            <p className="text-xs text-muted-foreground">{t("admin.emailVerified")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.accountManagement")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.searchAccounts")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("admin.active")}</SelectItem>
                  <SelectItem value="disabled">{t("admin.disabled")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allPlans")}</SelectItem>
                  <SelectItem value="free">{t("admin.free")}</SelectItem>
                  <SelectItem value="pro">{t("admin.pro")}</SelectItem>
                  <SelectItem value="premium">{t("admin.premium")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.account")}</TableHead>
                <TableHead>{t("admin.status")}</TableHead>
                <TableHead>{t("admin.plan")}</TableHead>
                <TableHead>{t("admin.users")}</TableHead>
                <TableHead>{t("admin.sandboxes")}</TableHead>
                <TableHead>{t("admin.projects")}</TableHead>
                <TableHead>{t("admin.apiKeys")}</TableHead>
                <TableHead>{t("admin.totalSpent")}</TableHead>
                <TableHead>{t("admin.created")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.account_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{account.display_name || account.name}</div>
                      <div className="text-sm text-muted-foreground">{account.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(account.is_active)}>
                      {account.is_active ? t("admin.active") : t("admin.disabled")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanColor(account.subscription_plan)}>
                      {account.subscription_plan}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.user_count}</TableCell>
                  <TableCell>{account.sandbox_count}</TableCell>
                  <TableCell>{account.project_count}</TableCell>
                  <TableCell>{account.api_key_count}</TableCell>
                  <TableCell>${account.total_spent.toFixed(2)}</TableCell>
                  <TableCell>{new Date(account.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedAccount(account.account_id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("admin.viewDetails")}
                        </DropdownMenuItem>
                        {account.is_active ? (
                          <DropdownMenuItem onClick={() => handleDisableAccount(account.account_id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t("admin.disable")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleEnableAccount(account.account_id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t("admin.enable")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteAccount(account.account_id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("admin.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Account Details Modal */}
      {selectedAccount && <AccountDetailsModal accountId={selectedAccount} onClose={() => setSelectedAccount(null)} />}
    </div>
  )
}
