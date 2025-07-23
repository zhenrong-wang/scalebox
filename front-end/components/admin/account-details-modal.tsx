"use client"

import { useState, useEffect } from "react"
import { Building, User, Server, Folder, Key, DollarSign, Calendar, Mail, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useLanguage } from "../../contexts/language-context"

interface AccountDetailsModalProps {
  accountId: string
  onClose: () => void
}

interface AccountData {
  account_id: string;
  name: string;
  email: string;
  display_name: string;
  description: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  users: UserData[];
  sandboxes: SandboxData[];
  projects: ProjectData[];
  api_keys: ApiKeyData[];
  total_spent: number;
}

interface UserData {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_root_user: boolean;
  created_at: string;
  last_login: string | null;
}

interface SandboxData {
  sandbox_id: string;
  name: string;
  status: string;
  created_at: string;
  owner_user_id: string;
}

interface ProjectData {
  project_id: string;
  name: string;
  description: string;
  created_at: string;
  owner_user_id: string;
}

interface ApiKeyData {
  key_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  owner_user_id: string;
}

export function AccountDetailsModal({ accountId, onClose }: AccountDetailsModalProps) {
  const { t } = useLanguage()
  const [account, setAccount] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAccountDetails = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE}/api/admin/accounts/${accountId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAccount(data);
        } else {
          console.error('Failed to load account details:', response.statusText);
        }
      } catch (error) {
        console.error('Error loading account details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccountDetails();
  }, [accountId]);

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("admin.loadingAccountDetails")}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!account) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-muted-foreground">{t("admin.accountNotFound")}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
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

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : "bg-blue-100 text-blue-800 border-blue-200"
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building className="h-5 w-5" />
            <span>{account.display_name || account.name}</span>
            <Badge className={getStatusColor(account.is_active)}>
              {account.is_active ? t("admin.active") : t("admin.disabled")}
            </Badge>
            <Badge className={getPlanColor(account.subscription_plan)}>
              {account.subscription_plan}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">{t("admin.overview")}</TabsTrigger>
            <TabsTrigger value="users">{t("admin.users")} ({account.users.length})</TabsTrigger>
            <TabsTrigger value="sandboxes">{t("admin.sandboxes")} ({account.sandboxes.length})</TabsTrigger>
            <TabsTrigger value="projects">{t("admin.projects")} ({account.projects.length})</TabsTrigger>
            <TabsTrigger value="api-keys">{t("admin.apiKeys")} ({account.api_keys.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {t("admin.basicInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                    <p className="text-sm font-mono">{account.account_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("admin.name")}</label>
                    <p className="text-sm">{account.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("admin.displayName")}</label>
                    <p className="text-sm">{account.display_name || t("admin.notSet")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("admin.email")}</label>
                    <p className="text-sm">{account.email || t("admin.notSet")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("admin.description")}</label>
                    <p className="text-sm">{account.description || t("admin.notSet")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("admin.subscriptionStatus")}</label>
                    <Badge className={getPlanColor(account.subscription_status)}>
                      {account.subscription_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.totalUsers")}</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{account.users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {account.users.filter(u => u.is_root_user).length} {t("admin.rootUsers")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.totalSandboxes")}</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{account.sandboxes.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {account.sandboxes.filter(s => s.status === "running").length} {t("admin.running")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.totalProjects")}</CardTitle>
                  <Folder className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{account.projects.length}</div>
                  <p className="text-xs text-muted-foreground">{t("admin.activeProjects")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("admin.totalSpent")}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${account.total_spent.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{t("admin.lifetimeSpending")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("admin.accountStatus")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(account.is_active)}>
                      {account.is_active ? t("admin.active") : t("admin.disabled")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{t("admin.accountStatus")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={account.is_verified ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}>
                      {account.is_verified ? t("admin.verified") : t("admin.unverified")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{t("admin.emailVerification")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("admin.accountUsers")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.user")}</TableHead>
                      <TableHead>{t("admin.role")}</TableHead>
                      <TableHead>{t("admin.status")}</TableHead>
                      <TableHead>{t("admin.created")}</TableHead>
                      <TableHead>{t("admin.lastLogin")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {account.users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.display_name || user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.is_root_user ? t("admin.rootUser") : user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.is_active)}>
                            {user.is_active ? t("admin.active") : t("admin.disabled")}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{user.last_login ? new Date(user.last_login).toLocaleDateString() : t("admin.never")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sandboxes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {t("admin.accountSandboxes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead>{t("admin.status")}</TableHead>
                      <TableHead>{t("admin.owner")}</TableHead>
                      <TableHead>{t("admin.created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {account.sandboxes.map((sandbox) => {
                      const owner = account.users.find(u => u.user_id === sandbox.owner_user_id);
                      return (
                        <TableRow key={sandbox.sandbox_id}>
                          <TableCell className="font-medium">{sandbox.name}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(sandbox.status === "running")}>
                              {sandbox.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{owner?.display_name || owner?.username || t("admin.unknown")}</TableCell>
                          <TableCell>{new Date(sandbox.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  {t("admin.accountProjects")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead>{t("admin.description")}</TableHead>
                      <TableHead>{t("admin.owner")}</TableHead>
                      <TableHead>{t("admin.created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {account.projects.map((project) => {
                      const owner = account.users.find(u => u.user_id === project.owner_user_id);
                      return (
                        <TableRow key={project.project_id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.description || t("admin.noDescription")}</TableCell>
                          <TableCell>{owner?.display_name || owner?.username || t("admin.unknown")}</TableCell>
                          <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {t("admin.accountApiKeys")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead>{t("admin.status")}</TableHead>
                      <TableHead>{t("admin.owner")}</TableHead>
                      <TableHead>{t("admin.created")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {account.api_keys.map((apiKey) => {
                      const owner = account.users.find(u => u.user_id === apiKey.owner_user_id);
                      return (
                        <TableRow key={apiKey.key_id}>
                          <TableCell className="font-medium">{apiKey.name}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(apiKey.is_active)}>
                              {apiKey.is_active ? t("admin.active") : t("admin.disabled")}
                            </Badge>
                          </TableCell>
                          <TableCell>{owner?.display_name || owner?.username || t("admin.unknown")}</TableCell>
                          <TableCell>{new Date(apiKey.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
