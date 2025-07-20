"use client"

import { useState, useEffect } from "react"
import { User, Mail, Lock, Copy, Check, LogOut } from "lucide-react"
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

interface AccountSettingsProps {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

// Update UserData type
type UserData = {
  accountId: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  // ...other fields as needed
};

interface ApiUser {
  account_id?: string;
  accountId?: string;
  id?: string;
  username?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
}

export function AccountSettings({ isOpen, onClose, onLogout }: AccountSettingsProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState({
    username: false,
    email: false,
  })
  const [formData, setFormData] = useState({
    username: userData?.username || "",
    newEmail: "",
    currentEmailConfirm: "",
  })
  const [alerts, setAlerts] = useState({
    username: "",
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState({
    username: false,
    email: false,
    password: false,
  })
  const [copiedAccountId, setCopiedAccountId] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    async function fetchUser() {
      const user = await UserService.getCurrentUser() as ApiUser | null;
      if (user) {
        // Handle both account_id (from backend) and accountId (fallback)
        const accountId = user.account_id || user.accountId || user.id || 'N/A';
        
        // Handle username - prefer username, then full_name, then name, then email prefix
        const username = user.username || user.full_name || user.name || 
          (user.email ? user.email.split('@')[0] : 'N/A');
        
        const email = user.email || 'N/A';
        
        const userDataObj: UserData = {
          accountId: String(accountId),
          username: String(username),
          email: String(email),
          role: user.role || 'user',
          isActive: user.is_active !== false,
          isVerified: user.is_verified === true,
          createdAt: user.created_at || new Date().toISOString()
        };
        setUserData(userDataObj);
      } else {
        setUserData(null);
      }
    }
    fetchUser();
  }, []);

  const copyAccountId = async () => {
    await navigator.clipboard.writeText(userData?.accountId || "N/A");
    setCopiedAccountId(true);
    setTimeout(() => setCopiedAccountId(false), 2000);
  }

  const handleUsernameUpdate = async () => {
    if (formData.username.length > 32) {
      setAlerts({ ...alerts, username: t("account.usernameTooLong") })
      return
    }
    if (formData.username.trim().length < 3) {
      setAlerts({ ...alerts, username: t("account.usernameTooShort") })
      return
    }

    setIsLoading({ ...isLoading, username: true })

    // Simulate API call
    setTimeout(() => {
      if (!userData) return;
      setUserData({ ...userData, username: formData.username })
      setIsEditing({ ...isEditing, username: false })
      setAlerts({ ...alerts, username: t("account.usernameUpdated") })
      setIsLoading({ ...isLoading, username: false })

      // Clear success message after 3 seconds
      setTimeout(() => setAlerts({ ...alerts, username: "" }), 3000)
    }, 1000)
  }

  const handleEmailUpdate = async () => {
    if (!formData.newEmail || !formData.currentEmailConfirm) {
      setAlerts({ ...alerts, email: t("account.emailFieldsEmpty") })
      return
    }
    if (formData.currentEmailConfirm !== userData?.email) {
      setAlerts({ ...alerts, email: t("account.emailConfirmMismatch") })
      return
    }
    if (formData.newEmail === userData?.email) {
      setAlerts({ ...alerts, email: t("account.newEmailSameAsCurrent") })
      return
    }

    setIsLoading({ ...isLoading, email: true })

    // Simulate API call
    setTimeout(() => {
      setAlerts({
        ...alerts,
        email: t("account.verificationEmailsSent"),
      })
      setIsEditing({ ...isEditing, email: false })
      setFormData({ ...formData, newEmail: "", currentEmailConfirm: "" })
      setIsLoading({ ...isLoading, email: false })

      // Clear message after 5 seconds
      setTimeout(() => setAlerts({ ...alerts, email: "" }), 5000)
    }, 1500)
  }

  const handlePasswordReset = async () => {
    setIsLoading({ ...isLoading, password: true });
    if (!userData?.email) return;
    const result = await UserService.resetPassword(userData.email);
      setAlerts({
        ...alerts,
      password: result?.msg || tReplace(t("account.passwordResetSent"), { email: userData.email }),
    });
    setIsLoading({ ...isLoading, password: false });
    setTimeout(() => setAlerts({ ...alerts, password: "" }), 5000);
  };

  const cancelEdit = (field: "username" | "email") => {
    setIsEditing({ ...isEditing, [field]: false })
    if (field === "username") {
      setFormData({ ...formData, username: userData?.username || "" })
    } else {
      setFormData({ ...formData, newEmail: "", currentEmailConfirm: "" })
    }
    setAlerts({ ...alerts, [field]: "" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("account.settings")}</DialogTitle>
          <DialogDescription>{t("account.security")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account ID */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("account.info")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t("account.id")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  {userData && (
                    <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                      {String(userData.accountId || 'N/A')}
                    </code>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAccountId}
                    className="flex items-center gap-1 bg-transparent"
                  >
                    {copiedAccountId ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t("action.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        {t("action.copy")}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("account.immutable")}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={
                    userData?.role === "admin" ? "bg-purple-100 text-purple-800" :
                    userData?.role === "root-user" ? "bg-orange-100 text-orange-800" :
                    "bg-blue-100 text-blue-800"
                  }>
                    {userData?.role || 'user'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Username */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("account.username")}</CardTitle>
              <CardDescription>{t("account.displayName")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.username && (
                <Alert className={alerts.username.includes("successfully") ? "border-green-200 bg-green-50" : ""}>
                  <AlertDescription>{alerts.username}</AlertDescription>
                </Alert>
              )}

              {!isEditing.username ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{userData?.username || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{t("account.currentUsername")}</div>
                  </div>
                  <Button variant="outline" onClick={() => setIsEditing({ ...isEditing, username: true })}>
                    {t("action.edit")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="username">{t("account.username")}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder={t("account.username")}
                      maxLength={32}
                    />
                    <div className="text-xs text-muted-foreground mt-1">{formData.username.length}/32 {t("account.username")}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUsernameUpdate} disabled={isLoading.username} size="sm">
                      {isLoading.username ? t("account.sending") : t("action.update")}
                    </Button>
                    <Button variant="outline" onClick={() => cancelEdit("username")} size="sm">
                      {t("action.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t("account.email")}
              </CardTitle>
              <CardDescription>{t("account.notifications")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.email && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription>{alerts.email}</AlertDescription>
                </Alert>
              )}

              {!isEditing.email ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{userData?.email || "N/A"}</div>
                    <div className="text-sm text-muted-foreground">{t("account.currentEmail")}</div>
                  </div>
                  <Button variant="outline" onClick={() => setIsEditing({ ...isEditing, email: true })}>
                    {t("account.changeEmail")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="currentEmail">{t("account.confirmCurrentEmail")}</Label>
                    <Input
                      id="currentEmail"
                      type="email"
                      value={formData.currentEmailConfirm}
                      onChange={(e) => setFormData({ ...formData, currentEmailConfirm: e.target.value })}
                      placeholder={t("account.confirmCurrentEmail")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newEmail">{t("account.newEmail")}</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={formData.newEmail}
                      onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                      placeholder={t("account.newEmail")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleEmailUpdate} disabled={isLoading.email} size="sm">
                      {isLoading.email ? t("account.sending") : t("action.update")}
                    </Button>
                    <Button variant="outline" onClick={() => cancelEdit("email")} size="sm">
                      {t("action.cancel")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("account.verificationEmailsSent")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t("account.password")}
              </CardTitle>
              <CardDescription>{t("account.resetPassword")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.password && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription>{alerts.password}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("account.password")}</div>
                  <div className="text-sm text-muted-foreground">{tReplace(t("account.lastUpdated"), { days: "30" })}</div>
                </div>
                <Button variant="outline" onClick={handlePasswordReset} disabled={isLoading.password}>
                  {isLoading.password ? t("account.sending") : t("account.resetPassword")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{tReplace(t("account.passwordResetSent"), { email: userData?.email || 'N/A' })}</p>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("account.status")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
              <div className="flex items-center gap-2">
                  <Badge className={userData?.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {userData?.isActive ? t("account.active") : t("account.inactive")}
                  </Badge>
                  <Badge className={userData?.isVerified ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>
                    {userData?.isVerified ? t("account.verified") : t("account.unverified")}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {tReplace(t("account.created"), { 
                    date: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "Unknown" 
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Section */}
          {onLogout && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <LogOut className="h-5 w-5" />
                  {t("account.logout") || "Logout"}
                </CardTitle>
                <CardDescription>{t("account.logoutDescription") || "Sign out of your account"}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("account.logout") || "Logout"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
