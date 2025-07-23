"use client"

import { useState, useEffect } from "react"
import { Search, Plus, MoreHorizontal, RefreshCw, Copy, Eye, Edit, Trash2, Key, Users, Power, PowerOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { userManagementService, type User, type CreateUserRequest, type UpdateUserRequest } from "../services/user-management-service"
import { useLanguage } from "../contexts/language-context"
import { PageLayout } from "@/components/ui/page-layout"

export function AccountUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    display_name: "",
    description: "",
    role: "user",
    is_active: true
  });
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [editUser, setEditUser] = useState<UpdateUserRequest>({})
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    rootUsers: 0,
    nonRootUsers: 0,
  })

  const { toast } = useToast()
  const { t } = useLanguage()

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await userManagementService.getUsers()
      setUsers(response.users)
      setFilteredUsers(response.users)
      
      // Calculate stats
      const totalUsers = response.users.length
      const activeUsers = response.users.filter(u => u.is_active).length
      const rootUsers = response.users.filter(u => u.is_root_user).length
      const nonRootUsers = response.users.filter(u => !u.is_root_user).length
      
      setStats({
        totalUsers,
        activeUsers,
        rootUsers,
        nonRootUsers,
      })
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshAll = async () => {
    await loadUsers()
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (user) =>
          (user.display_name && user.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.description && user.description.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((user) => user.is_active)
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((user) => !user.is_active)
      } else if (statusFilter === "root") {
        filtered = filtered.filter((user) => user.is_root_user)
      } else if (statusFilter === "non-root") {
        filtered = filtered.filter((user) => !user.is_root_user)
      }
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter])

  const handleCreateUser = async () => {
    try {
      // Validate username format
      const username = newUser.username.trim();
      if (!username) {
        toast({
          title: "Error",
          description: "Username is required",
          variant: "destructive",
        });
        return;
      }
      
      if (username.length < 3) {
        toast({
          title: "Error",
          description: "Username must be at least 3 characters long",
          variant: "destructive",
        });
        return;
      }
      
      if (!username[0].match(/[a-z]/)) {
        toast({
          title: "Error",
          description: "Username must start with a lowercase letter",
          variant: "destructive",
        });
        return;
      }
      
      if (!username.match(/^[a-z0-9_-]+$/)) {
        toast({
          title: "Error",
          description: "Username can only contain lowercase letters, numbers, underscores, and hyphens",
          variant: "destructive",
        });
        return;
      }
      
      // Prepare user data with defaults
      const userData = {
        ...newUser,
        display_name: newUser.display_name.trim() || newUser.username,
        description: newUser.description.trim() || newUser.username
      };
      
      await userManagementService.createUser(userData)
      toast({
        title: "Success",
        description: "User created successfully. Check your email for credentials.",
      })
      setIsCreateDialogOpen(false)
      setNewUser({ username: "", display_name: "", description: "", role: "user", is_active: true })
      setUsernameError("")
      await loadUsers()
    } catch (error: any) {
      // Handle specific backend validation errors
      if (error.message && error.message.includes("already exists")) {
        setUsernameError("Username already exists");
        toast({
          title: "Error",
          description: "Username already exists. Please choose a different username.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create user",
          variant: "destructive",
        });
      }
    }
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return
    
    try {
      await userManagementService.updateUser(selectedUser.user_id, editUser)
      toast({
        title: "Success",
        description: "User updated successfully",
      })
      setIsEditDialogOpen(false)
      setSelectedUser(null)
      setEditUser({})
      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      await userManagementService.deleteUser(selectedUser.user_id)
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      setIsDeleteDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser) return
    
    try {
      await userManagementService.resetUserPassword(selectedUser.user_id)
      toast({
        title: "Success",
        description: "Password reset successfully. New credentials have been sent to your email.",
      })
      setIsResetPasswordDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async () => {
    if (!selectedUser) return

    try {
      const newStatus = !selectedUser.is_active
      await userManagementService.updateUser(selectedUser.user_id, { is_active: newStatus })
      toast({
        title: "Success",
        description: `User ${newStatus ? 'enabled' : 'disabled'} successfully.`,
      })
      setIsToggleStatusDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "default" : "secondary"
  }

  const getRoleColor = (isRootUser: boolean) => {
    return isRootUser ? "destructive" : "outline"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Prepare summary cards data
  const summaryCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: <Users className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: "Root Users",
      value: stats.rootUsers,
      icon: <Users className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: "Non-Root Users",
      value: stats.nonRootUsers,
      icon: <Users className="h-4 w-4 text-muted-foreground" />
    }
  ]

  return (
    <PageLayout
      header={{
        description: "Manage users in your account",
        children: (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new non-root user in your account. They will receive a unique signin URL and initial password.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        value={newUser.username}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase();
                          setNewUser({ ...newUser, username: value });
                          
                          // Real-time validation
                          if (!value.trim()) {
                            setUsernameError("Username is required");
                          } else if (value.length < 3) {
                            setUsernameError("Username must be at least 3 characters long");
                          } else if (!value[0].match(/[a-z]/)) {
                            setUsernameError("Username must start with a lowercase letter");
                          } else if (!value.match(/^[a-z0-9_-]+$/)) {
                            setUsernameError("Username can only contain lowercase letters, numbers, underscores, and hyphens");
                          } else {
                            // Check for duplicate username
                            const existingUser = users.find(user => 
                              user.username.toLowerCase() === value.toLowerCase()
                            );
                            
                            if (existingUser) {
                              setUsernameError("Username already exists");
                            } else {
                              setUsernameError("");
                            }
                          }
                        }}
                        placeholder="Enter username (lowercase letters, numbers, _, -)"
                        className={usernameError ? "border-red-500" : ""}
                      />
                      {isCheckingDuplicate && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}
                      {!usernameError && newUser.username.trim() && !isCheckingDuplicate && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="text-green-500">✓</div>
                        </div>
                      )}
                    </div>
                    {usernameError ? (
                      <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Must start with lowercase letter, 3+ characters, only a-z, 0-9, _, -
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={newUser.display_name || ""}
                      onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                      placeholder="Enter display name (will default to username if empty)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. Will use username if left empty.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newUser.description || ""}
                      onChange={(e) => setNewUser({ ...newUser, description: e.target.value })}
                      placeholder="Enter description (will default to username if empty)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. Will use username if left empty.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={!newUser.username.trim() || !!usernameError}>
                    Create User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )
      }}
      summaryCards={summaryCards}
    >
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="root">Root Users</SelectItem>
            <SelectItem value="non-root">Non-Root Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Signin URL</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        {user.display_name && (
                          <div className="text-sm text-muted-foreground">{user.display_name}</div>
                        )}
                        {user.description && (
                          <div className="text-sm text-muted-foreground">{user.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleColor(user.is_root_user)}>
                        {user.is_root_user ? "Root User" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(user.is_active)}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login ? formatDate(user.last_login) : "Never"}
                    </TableCell>
                    <TableCell>
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      {!user.is_root_user && user.dedicated_signin_url ? (
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <>
                              <div className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md border border-blue-200 transition-colors">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <a
                                  href={`http://localhost:3000/signin/${user.dedicated_signin_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-700 hover:text-blue-900 text-xs font-medium"
                                >
                                  Signin Link
                                </a>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(`http://localhost:3000/signin/${user.dedicated_signin_url}`)}
                                className="h-6 w-6 p-0 hover:bg-blue-50"
                                title="Copy signin link"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 opacity-60">
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                <span className="text-gray-500 text-xs font-medium line-through">
                                  Signin Link
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                className="h-6 w-6 p-0 opacity-50 cursor-not-allowed"
                                title="Link disabled - user is inactive"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setEditUser({
                              display_name: user.display_name || "",
                              description: user.description || ""
                            });
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {!user.is_root_user && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setIsToggleStatusDialogOpen(true);
                            }}>
                              {user.is_active ? (
                                <PowerOff className="mr-2 h-4 w-4" />
                              ) : (
                                <Power className="mr-2 h-4 w-4" />
                              )}
                              {user.is_active ? 'Disable' : 'Enable'} User
                            </DropdownMenuItem>
                          )}
                          {!user.is_root_user && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setIsResetPasswordDialogOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                          )}
                          {!user.is_root_user && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteDialogOpen(true);
                            }} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Note: Username cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_display_name">Display Name</Label>
              <Input
                id="edit_display_name"
                value={editUser.display_name || ""}
                onChange={(e) => setEditUser({ ...editUser, display_name: e.target.value })}
                placeholder="Enter display name"
              />
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editUser.description || ""}
                onChange={(e) => setEditUser({ ...editUser, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Dialog */}
      <Dialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser?.is_active ? 'Disable' : 'Enable'} User</DialogTitle>
            <DialogDescription>
              {selectedUser?.is_active 
                ? `Are you sure you want to disable ${selectedUser?.display_name || selectedUser?.username}? This user will no longer be able to sign in using their dedicated link.`
                : `Are you sure you want to enable ${selectedUser?.display_name || selectedUser?.username}? This user will be able to sign in using their dedicated link.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsToggleStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={selectedUser?.is_active ? "destructive" : "default"} 
              onClick={handleToggleStatus}
            >
              {selectedUser?.is_active ? 'Disable' : 'Enable'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the password for this user? This will generate a new password and send it to the user's email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetPassword}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
} 