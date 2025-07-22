"use client"

import { useState, useEffect } from "react"
import { User, Mail, Lock, Copy, Check, LogOut, Eye, EyeOff, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "../contexts/language-context"
import { tReplace } from "../lib/i18n"
import { UserService } from "../services/user-service";
import { Separator } from "@/components/ui/separator"

interface AccountSettingsProps {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
  onUserUpdate?: (userData: UserData) => void
}

// Update UserData type
interface UserData {
  id?: string;
  user_id?: string;
  username?: string;
  display_name?: string;
  email?: string;
  role?: string;
  account_id?: string;
  is_root_user?: boolean;
  is_verified?: boolean;
  is_first_time_login?: boolean;
  dedicated_signin_url?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

interface ApiUser {
  id?: string;
  user_id?: string;
  username?: string;
  display_name?: string;
  email?: string;
  role?: string;
  account_id?: string;
  accountId?: string;
  is_root_user?: boolean;
  is_verified?: boolean;
  is_first_time_login?: boolean;
  dedicated_signin_url?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
  account_email?: string;
  account_name?: string;
  is_active?: boolean;
}

export function AccountSettings({ isOpen, onClose, onLogout, onUserUpdate }: AccountSettingsProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [emailChangeStatus, setEmailChangeStatus] = useState<any>(null);
  const [isEditing, setIsEditing] = useState({
    displayName: false,
    accountEmail: false,
  })
  const [formData, setFormData] = useState({
    displayName: "",
    currentEmail: "",
    newEmail: "",
  })
  const [alerts, setAlerts] = useState({
    displayName: "",
    password: "",
    accountEmail: "",
  })
  const [isLoading, setIsLoading] = useState({
    displayName: false,
    password: false,
    accountEmail: false,
  })
  const [copiedAccountId, setCopiedAccountId] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    async function fetchUser() {
      const user = await UserService.getCurrentUser() as ApiUser | null;
      if (user) {
        // Handle both account_id (from backend) and accountId (fallback)
        const accountId = user.account_id || user.accountId || user.id || 'N/A';
        
        setUserData({
          account_id: String(accountId),
          username: String(user.username || 'N/A'),
          display_name: user.display_name || user.name || undefined,
          email: String(user.email || 'N/A'),
          role: user.role || 'user',
          is_root_user: Boolean(user.is_root_user),
          is_verified: Boolean(user.is_verified),
          is_first_time_login: Boolean(user.is_first_time_login),
          dedicated_signin_url: user.dedicated_signin_url,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at,
          is_active: Boolean(user.is_active)
        });
        setFormData(prev => ({ ...prev, displayName: userData?.display_name || "" }));
        
        // Fetch email change status for root users
        if (user.is_root_user) {
          await fetchEmailChangeStatus();
        }
      } else {
        setUserData(null);
      }
    }
    fetchUser();
  }, []);

  const fetchEmailChangeStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth-token');
      
      if (!token) return;

      const response = await fetch(`${apiUrl}/api/user-management/account/email-change-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const status = await response.json();
        setEmailChangeStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch email change status:', error);
    }
  };

  const copyAccountId = async () => {
    await navigator.clipboard.writeText(userData?.account_id || "N/A");
    setCopiedAccountId(true);
    setTimeout(() => setCopiedAccountId(false), 2000);
  }

  const handleDisplayNameUpdate = async () => {
    if (formData.displayName.length > 100) {
      setAlerts({ ...alerts, displayName: "Display name must be less than 100 characters" })
      return
    }

    setIsLoading({ ...isLoading, displayName: true })

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('auth-token')
      
      const response = await fetch(`${apiUrl}/api/user-management/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: formData.displayName
        })
      })

      if (response.ok) {
        if (!userData) return;
        
        // Fetch updated user data from API to get the correct structure
        const updatedUserResponse = await fetch(`${apiUrl}/api/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (updatedUserResponse.ok) {
          const updatedUserData = await updatedUserResponse.json();
          setUserData({ ...userData, display_name: formData.displayName });
          setIsEditing({ ...isEditing, displayName: false });
          setAlerts({ ...alerts, displayName: "Display name updated successfully" });
          
          // Clear success message after 3 seconds
          setTimeout(() => setAlerts({ ...alerts, displayName: "" }), 3000);
          
          // Pass the full API user data to the callback
          onUserUpdate?.(updatedUserData);
        } else {
          // Fallback to local update if API fetch fails
          const updatedUserData: UserData = { ...userData, display_name: formData.displayName };
          setUserData(updatedUserData);
          setIsEditing({ ...isEditing, displayName: false });
          setAlerts({ ...alerts, displayName: "Display name updated successfully" });
          setTimeout(() => setAlerts({ ...alerts, displayName: "" }), 3000);
          onUserUpdate?.(updatedUserData);
        }
      } else {
        const errorData = await response.json()
        setAlerts({ ...alerts, displayName: errorData.detail || "Failed to update display name" })
      }
    } catch (error) {
      setAlerts({ ...alerts, displayName: "Failed to update display name" })
    } finally {
      setIsLoading({ ...isLoading, displayName: false })
    }
  }

  const handlePasswordReset = async () => {
    if (!userData) return;
    
    if (userData.is_root_user) {
      // Root users use email reset
      if (!userData.email) {
        setAlerts({ ...alerts, password: "Email address not found" });
        return;
      }
      setIsLoading({ ...isLoading, password: true });
      const result = await UserService.resetPassword(userData.email);
      setAlerts({
        ...alerts,
        password: result?.msg || `Password reset email sent to ${userData.email}`,
      });
      setIsLoading({ ...isLoading, password: false });
      setTimeout(() => setAlerts({ ...alerts, password: "" }), 5000);
    } else {
      // Non-root users use dialog
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('auth-token')
      
      const response = await fetch(`${apiUrl}/api/user-management/reset-own-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })

      if (response.ok) {
        setShowPasswordDialog(false)
        setAlerts({ ...alerts, password: "Password changed successfully" })
        setTimeout(() => setAlerts({ ...alerts, password: "" }), 3000)
        return { success: true }
      } else {
        const errorData = await response.json()
        return { success: false, error: errorData.detail || "Password change failed" }
      }
    } catch (error) {
      return { success: false, error: "Password change failed" }
    }
  }

  const handleAccountEmailChange = async () => {
    if (!formData.currentEmail || !formData.newEmail) {
      setAlerts({ ...alerts, accountEmail: "Please fill in both current and new email addresses." });
      return;
    }

    setIsLoading({ ...isLoading, accountEmail: true });
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setAlerts({ ...alerts, accountEmail: "Authentication required." });
        return;
      }

      const response = await fetch(`${apiUrl}/api/user-management/account/request-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_email: formData.currentEmail,
          new_email: formData.newEmail
        })
      });

      if (response.ok) {
        setIsEditing({ ...isEditing, accountEmail: false });
        setFormData({ ...formData, currentEmail: "", newEmail: "" });
        setAlerts({ ...alerts, accountEmail: "Account email change request sent. Please check your emails." });
        setTimeout(() => setAlerts({ ...alerts, accountEmail: "" }), 5000);
        
        // Refresh email change status
        await fetchEmailChangeStatus();
      } else {
        const errorData = await response.json();
        setAlerts({ ...alerts, accountEmail: errorData.detail || "Failed to request account email change." });
      }
    } catch (error) {
      setAlerts({ ...alerts, accountEmail: "Failed to request account email change." });
    } finally {
      setIsLoading({ ...isLoading, accountEmail: false });
    }
  };

  const cancelEdit = (field: "displayName" | "accountEmail") => {
    setIsEditing({ ...isEditing, [field]: false })
    if (field === "displayName") {
      setFormData({ ...formData, displayName: userData?.display_name || "" })
    } else if (field === "accountEmail") {
      setFormData({ ...formData, currentEmail: "", newEmail: "" });
      setAlerts({ ...alerts, accountEmail: "" });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold">
              {userData?.is_root_user ? "Account Settings" : "User Settings"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Account Info */}
            <div className="space-y-3 p-4 bg-gray-50/50 rounded-lg border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Information</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Account ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-3 py-1.5 rounded-md font-mono border shadow-sm">
                    {userData?.account_id}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyAccountId} 
                    className="h-7 w-7 p-0 hover:bg-gray-100"
                  >
                    {copiedAccountId ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {!userData?.is_root_user && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Account Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 max-w-48 truncate">{userData?.email}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(userData?.email || "");
                        setCopiedAccountId(true);
                        setTimeout(() => setCopiedAccountId(false), 2000);
                      }} 
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                    >
                      {copiedAccountId ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="space-y-3 p-4 bg-gray-50/50 rounded-lg border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">User Profile</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Username</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-mono">{userData?.username}</span>
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">Read Only</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Role</span>
                <Badge className={
                  userData?.is_root_user ? "bg-orange-50 text-orange-700 border-orange-200" :
                  userData?.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" :
                  "bg-blue-50 text-blue-700 border-blue-200"
                }>
                  {userData?.is_root_user ? "Root User" : (userData?.role || 'user')}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Display Name</span>
                {!isEditing.displayName ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{userData?.display_name || "Not set"}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing({ ...isEditing, displayName: true })} 
                      className="h-7 px-3 text-xs hover:bg-gray-50"
                    >
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Display name"
                      maxLength={100}
                      className="h-7 w-36 text-xs border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button 
                      onClick={handleDisplayNameUpdate} 
                      disabled={isLoading.displayName}
                      className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isLoading.displayName ? "Saving..." : "Save"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => cancelEdit("displayName")} 
                      className="h-7 px-3 text-xs hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {alerts.displayName && (
                <div className={`text-xs px-3 py-2 rounded-md ${
                  alerts.displayName.includes("successfully") 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {alerts.displayName}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Password</span>
                <Button 
                  variant="outline" 
                  onClick={handlePasswordReset} 
                  disabled={isLoading.password} 
                  size="sm" 
                  className="h-7 px-3 text-xs hover:bg-gray-50"
                >
                  {isLoading.password ? "..." : (userData?.is_root_user ? "Reset" : "Change")}
                </Button>
              </div>

              {alerts.password && (
                <div className="text-xs px-3 py-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {alerts.password}
                </div>
              )}
            </div>



            {/* Account Email Change - Only for Root Users */}
            {userData?.is_root_user && (
              <div className="space-y-3 p-4 bg-gray-50/50 rounded-lg border">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Email Settings</h3>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Account Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 max-w-48 truncate">{userData?.email}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(userData?.email || "");
                        setCopiedAccountId(true);
                        setTimeout(() => setCopiedAccountId(false), 2000);
                      }} 
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                    >
                      {copiedAccountId ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Change Account Email</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing({ ...isEditing, accountEmail: true })} 
                    className="h-7 px-3 text-xs hover:bg-gray-50"
                  >
                    Change
                  </Button>
                </div>

                {isEditing.accountEmail && (
                  <div className="space-y-3 p-3 bg-white rounded border">
                    <div>
                      <Label htmlFor="current_email">Current Email</Label>
                      <Input
                        id="current_email"
                        type="email"
                        value={formData.currentEmail || ""}
                        onChange={(e) => setFormData({ ...formData, currentEmail: e.target.value })}
                        placeholder="Enter current account email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_email">New Email</Label>
                      <Input
                        id="new_email"
                        type="email"
                        value={formData.newEmail || ""}
                        onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                        placeholder="Enter new account email"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleAccountEmailChange}
                        disabled={isLoading.accountEmail || !formData.currentEmail || !formData.newEmail}
                      >
                        {isLoading.accountEmail ? "Sending..." : "Request Change"}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setIsEditing({ ...isEditing, accountEmail: false });
                          setFormData({ ...formData, currentEmail: "", newEmail: "" });
                          setAlerts({ ...alerts, accountEmail: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                    {alerts.accountEmail && (
                      <Alert>
                        <AlertDescription>{alerts.accountEmail}</AlertDescription>
                      </Alert>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Confirmation links will be sent to both email addresses. Both must be clicked within 30 minutes to complete the change.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Email Change Status - Only for Root Users */}
            {userData?.is_root_user && emailChangeStatus?.has_pending_request && (
              <div className="space-y-3 p-4 bg-orange-50/50 rounded-lg border border-orange-200">
                <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Email Change in Progress
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="text-orange-700">
                    {emailChangeStatus.message}
                  </div>
                  
                  {emailChangeStatus.status === 'partial_confirmed' && (
                    <div className="space-y-2 p-3 bg-orange-100 rounded border border-orange-300">
                      <div>
                        <span className="text-orange-800 font-medium">Confirmed:</span>
                        <span className="ml-2 text-orange-900 font-mono">{emailChangeStatus.confirmed_email}</span>
                      </div>
                      <div>
                        <span className="text-orange-800 font-medium">Waiting for:</span>
                        <span className="ml-2 text-orange-900 font-mono">{emailChangeStatus.pending_email}</span>
                      </div>
                      {emailChangeStatus.expires_at && (
                        <div>
                          <span className="text-orange-800 font-medium">Expires in:</span>
                          <span className="ml-2 text-orange-900">
                            {(() => {
                              const expiry = new Date(emailChangeStatus.expires_at);
                              const now = new Date();
                              const diffMs = expiry.getTime() - now.getTime();
                              const diffMins = Math.floor(diffMs / (1000 * 60));
                              
                              if (diffMins <= 0) return 'Expired';
                              if (diffMins < 60) return `${diffMins} minutes`;
                              const diffHours = Math.floor(diffMins / 60);
                              return `${diffHours} hours ${diffMins % 60} minutes`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {emailChangeStatus.status === 'none_confirmed' && (
                    <div className="space-y-2 p-3 bg-orange-100 rounded border border-orange-300">
                      <div>
                        <span className="text-orange-800 font-medium">Current:</span>
                        <span className="ml-2 text-orange-900 font-mono">{emailChangeStatus.current_email}</span>
                      </div>
                      <div>
                        <span className="text-orange-800 font-medium">New:</span>
                        <span className="ml-2 text-orange-900 font-mono">{emailChangeStatus.new_email}</span>
                      </div>
                      {emailChangeStatus.expires_at && (
                        <div>
                          <span className="text-orange-800 font-medium">Expires in:</span>
                          <span className="ml-2 text-orange-900">
                            {(() => {
                              const expiry = new Date(emailChangeStatus.expires_at);
                              const now = new Date();
                              const diffMs = expiry.getTime() - now.getTime();
                              const diffMins = Math.floor(diffMs / (1000 * 60));
                              
                              if (diffMins <= 0) return 'Expired';
                              if (diffMins < 60) return `${diffMins} minutes`;
                              const diffHours = Math.floor(diffMins / 60);
                              return `${diffHours} hours ${diffMins % 60} minutes`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-orange-600">
                    Please check both email addresses for confirmation links. The email change will only take effect when both links are clicked.
                  </div>
                </div>
              </div>
            )}

            {/* Account Status */}
            <div className="space-y-3 p-4 bg-gray-50/50 rounded-lg border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Account Status</h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <Badge className={
                  userData?.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                }>
                  {userData?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Verification</span>
                <Badge className={
                  userData?.is_verified ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
                }>
                  {userData?.is_verified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Member Since</span>
                <span className="text-sm text-gray-500">
                  {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6">
            <Button variant="outline" onClick={onClose} className="px-4">
              Close
            </Button>
            {onLogout && (
              <Button variant="destructive" onClick={onLogout} className="px-4">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <PasswordChangeDialog
          onPasswordChange={handlePasswordChange}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </>
  )
}

// Password Change Dialog Component
function PasswordChangeDialog({ 
  onPasswordChange, 
  onClose 
}: {
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  onClose: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long")
      return
    }

    setIsLoading(true)
    try {
      const result = await onPasswordChange(currentPassword, newPassword)
      if (!result.success) {
        setError(result.error || "Password change failed")
      } else {
        onClose()
      }
    } catch (error) {
      setError("Password change failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and new password to change your account password.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isLoading}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
