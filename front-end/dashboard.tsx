"use client"

import { useState, useEffect, useRef } from "react"
import { User } from "lucide-react"
import { useResizableSidebar } from "./hooks/use-resizable-sidebar"
import { ThemeProvider } from "./contexts/theme-context"
import { ThemeToggle } from "./components/theme-toggle"
import { AccountSettings } from "./components/account-settings"
import { Sidebar } from "./components/sidebar"
import { SandboxPage } from "./components/sandbox-page"
import { TemplatesPage } from "./components/templates-page"
import { ApiKeyPage } from "./components/api-key-page"
import { ApiKeyManagement } from "./components/api-key-management"
import { BudgetPage } from "./components/budget-page"
import { BillingsPage } from "./components/billings-page"
import { Button } from "@/components/ui/button"
import { LandingPage } from "./components/landing-page"
import { SignInPage } from "./components/signin-page"
import { SignUpPage } from "./components/signup-page"
import { VerificationPage } from "./components/verification-page"
import { ResetPasswordRequest } from "./components/reset-password-request"
import { ResetPasswordConfirm } from "./components/reset-password-confirm"
import { AdminDashboard } from "./components/admin/admin-dashboard"
import { ProjectManagement } from "./components/projects/project-management"
import { AdminBillingAnalytics } from "./components/admin/admin-billing-analytics"
import { AccountManagement } from "./components/admin/account-management"
import { AccountUserManagement } from "./components/account-user-management"
import { SystemHealth } from "./components/admin/system-health"
import { SandboxManagement } from "./components/admin/sandbox-management"
import { UserService } from "./services/user-service"
import { useLanguage } from "./contexts/language-context"
import { LanguageToggle } from "./components/language-toggle"
import { AdminApiKeyManagement } from "./components/admin/api-key-management"
import { NotificationButton } from "./components/notification-button"
import { Badge } from "./components/ui/badge"

export type PageType =
  | "sandboxes"
  | "templates"
  | "api-key"
  | "budget"
  | "billings"
  | "projects"
  | "admin"
  | "users"
  | "admin-billing"
  | "system"
  | "sandbox-management"
  | "admin-api-keys"
type AuthState = "landing" | "signin" | "signup" | "verification" | "reset-password-request" | "reset-password-confirm" | "authenticated"

function DashboardContent() {
  const [authState, setAuthState] = useState<AuthState>("landing");

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for reset password token in URL
      const urlParams = new URLSearchParams(window.location.search);
      const resetToken = urlParams.get('token');
      
      if (resetToken) {
        setResetToken(resetToken);
        setAuthState("reset-password-confirm");
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (localStorage.getItem("auth-token")) {
        setAuthState("authenticated");
      }
    }
  }, []);

  // Listen for auth-required events from API services
  useEffect(() => {
    const handleAuthRequired = () => {
      setAuthState("signin");
    };

    const handleAccountSuspended = () => {
      window.location.replace("/account-suspended");
    };

    if (typeof window !== "undefined") {
      window.addEventListener('auth-required', handleAuthRequired);
      window.addEventListener('account-suspended', handleAccountSuspended);
      return () => {
        window.removeEventListener('auth-required', handleAuthRequired);
        window.removeEventListener('account-suspended', handleAccountSuspended);
      };
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false)
  const [verificationData, setVerificationData] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const { sidebarWidth, isCollapsed, isResizing, sidebarRef, startResizing, toggleCollapse } = useResizableSidebar()
  const { t } = useLanguage()
  
  // Refs for captcha reset
  const signinRef = useRef<{ resetCaptcha: () => void }>(null)
  const signupRef = useRef<{ resetCaptcha: () => void }>(null)

  // Load current user data
  useEffect(() => {
    if (authState === "authenticated") {
      const loadUserData = async () => {
        try {
          console.log("=== LOADING USER DATA ===");
          const userData = await UserService.getCurrentUser(false); // No auto-redirect for dashboard loading
          console.log("User data loaded:", userData);
          
          // Check if user data indicates suspended account
          if (!userData) {
            const cachedUserData = localStorage.getItem("user-data");
            if (cachedUserData) {
              try {
                const parsed = JSON.parse(cachedUserData);
                if (parsed.account_suspended) {
                  // Redirect to suspended page
                  window.location.replace("/account-suspended");
                  return;
                }
              } catch (error) {
                console.error("Failed to parse cached user data:", error);
              }
            }
          }
          
          setCurrentUser(userData);
          
          console.log("User type determination:");
          console.log("- userData.role:", userData?.role);
          console.log("- userData.is_root_user:", userData?.is_root_user);
        } catch (error) {
          console.error("Error loading user data:", error);
          setCurrentUser(null);
        }
      }

      loadUserData();
    }
  }, [authState]);

  const isAdmin = currentUser?.role === "admin";
  const isRootUser = currentUser?.is_root_user === true || currentUser?.role === "root-user";

  // Set initial page based on user role and URL hash
  const [currentPage, setCurrentPage] = useState<PageType>(() => {
    // Check URL hash for initial page
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace('#', '')
      const validPages: PageType[] = ["sandboxes", "templates", "api-key", "billings", "projects", "admin", "users", "admin-billing", "system", "sandbox-management", "admin-api-keys"]
      if (hash && validPages.includes(hash as PageType)) {
        return hash as PageType
      }
    }
    // Default to projects for most users
    return "projects"
  })

  // Update default page when user role is determined
  useEffect(() => {
    if (currentUser) {
      if (isAdmin && (currentPage === "projects" || currentPage === "sandboxes")) {
        setCurrentPage("admin")
        window.location.hash = "admin"
      } else if (!isAdmin && !isRootUser && (currentPage === "users" || currentPage === "sandbox-management")) {
        setCurrentPage("projects")
        window.location.hash = "projects"
      }
    }
  }, [currentUser, isAdmin, isRootUser, currentPage])

  // Listen for browser back/forward navigation (hash changes)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      const validPages: PageType[] = ["sandboxes", "templates", "api-key", "billings", "projects", "admin", "users", "admin-billing", "system", "sandbox-management", "admin-api-keys"]
      if (hash && validPages.includes(hash as PageType)) {
        setCurrentPage(hash as PageType)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const handleSignIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await UserService.signin(email, password);
      if (!result || !result.access_token) {
        // Reset captcha on authentication failure
        signinRef.current?.resetCaptcha();
        return { success: false, error: "Invalid email or password" };
      }
      
      // Check if account is suspended
      if (result.account_suspended) {
        // Don't try to fetch user profile for suspended accounts
        // The UserService.signin already handles redirection
        return { success: true };
      }
      
      // Fetch user profile for active accounts
      const user = await UserService.getCurrentUser(true); // Enable auto-redirect for active signin
      if (user) {
        setCurrentUser(user);
        setAuthState("authenticated");
        // Set initial hash if none exists
        if (typeof window !== "undefined" && !window.location.hash) {
          window.location.hash = "projects";
        }
        return { success: true };
      }
      // Reset captcha on profile fetch failure
      signinRef.current?.resetCaptcha();
      return { success: false, error: "Failed to fetch user profile" };
    } catch (error) {
      // Reset captcha on any error
      signinRef.current?.resetCaptcha();
      return { success: false, error: "Invalid email or password" };
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await UserService.signup({ email, password, name });
      if (result && !result.error && !result.detail) {
        // Store verification data and go to verification state
        setVerificationData({ email, password, name });
        setAuthState("verification");
        return { success: true };
      }
      // Reset captcha on signup failure
      signupRef.current?.resetCaptcha();
      return { success: false, error: result?.detail || result?.error || "Signup failed" };
    } catch (error) {
      // Reset captcha on any error
      signupRef.current?.resetCaptcha();
      return { success: false, error: "Signup failed" };
    }
  };

  const handleVerification = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!verificationData) {
      return { success: false, error: "No verification data found" };
    }

    try {
      const result = await UserService.verifyEmail(code, verificationData.email);
      if (result && !result.error && !result.detail) {
        // Email verified, now sign in
        const signinResult = await handleSignIn(verificationData.email, verificationData.password);
        if (signinResult.success) {
          setVerificationData(null); // Clear verification data
          // Set initial hash for new users
          if (typeof window !== "undefined" && !window.location.hash) {
            window.location.hash = "projects";
          }
          return { success: true };
        } else {
          return { success: false, error: signinResult.error || "Sign in failed after verification" };
        }
      }
      return { success: false, error: result?.detail || result?.error || "Verification failed" };
    } catch (error) {
      return { success: false, error: "Verification failed" };
    }
  };

  const handleResendVerification = async (): Promise<{ success: boolean; error?: string }> => {
    if (!verificationData) {
      return { success: false, error: "No verification data found" };
    }

    try {
      const result = await UserService.resendVerification(verificationData.email);
      if (result && !result.error && !result.detail) {
        return { success: true };
      }
      return { success: false, error: result?.detail || result?.error || "Failed to resend verification" };
    } catch (error) {
      return { success: false, error: "Failed to resend verification" };
    }
  };

  const handleLogout = () => {
    // Clear any stored authentication data
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token")
      localStorage.removeItem("user-data")
      // Clear URL hash
      window.location.hash = ""
    }

    // Reset state
    setCurrentUser(null)
    setCurrentPage("projects") // Reset to default page
    setAuthState("landing")
  }

  const handleUserUpdate = (updatedUserData: any) => {
    setCurrentUser(updatedUserData)
  }

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    // Update URL hash to reflect current page
    if (typeof window !== "undefined") {
      window.location.hash = page;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case "sandboxes":
        return isAdmin ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessRestricted")}</div>
            <div>{t("dashboard.adminNoSandboxes")}</div>
          </div>
        ) : (
          <SandboxPage />
        )
      case "templates":
        return isAdmin ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessRestricted")}</div>
            <div>{t("dashboard.adminNoTemplates")}</div>
          </div>
        ) : (
          <TemplatesPage />
        )
      case "projects":
        return <ProjectManagement />
      case "admin":
        return isAdmin ? (
          <AdminDashboard />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessDenied")}</div>
            <div>{t("dashboard.noPermission")}</div>
          </div>
        )
      case "users":
        return isAdmin ? (
          <AccountManagement />
        ) : isRootUser ? (
          <AccountUserManagement />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessDenied")}</div>
            <div>{t("dashboard.noPermission")}</div>
          </div>
        )
      case "sandbox-management":
        return isAdmin ? (
          <SandboxManagement />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessDenied")}</div>
            <div>{t("dashboard.noPermission")}</div>
          </div>
        )
      case "admin-billing":
        return isAdmin ? (
          <AdminBillingAnalytics />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessDenied")}</div>
            <div>{t("dashboard.noPermission")}</div>
          </div>
        )
      case "system":
        return isAdmin ? (
          <SystemHealth />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">{t("dashboard.accessDenied")}</div>
            <div>{t("dashboard.noPermission")}</div>
          </div>
        )
      case "api-key":
        return isAdmin ? <ApiKeyManagement /> : <ApiKeyPage />
      case "budget":
        return <BudgetPage />
      case "billings":
        return <BillingsPage />
      case "admin-api-keys":
        return isAdmin ? <AdminApiKeyManagement /> : <div className="text-center py-8 text-muted-foreground">{t("dashboard.accessDenied")}</div>;
      default:
        return isAdmin ? <AdminDashboard /> : <ProjectManagement />
    }
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case "sandboxes":
        return t("dashboard.page.sandboxes")
      case "templates":
        return t("dashboard.page.templates")
      case "projects":
        return t("dashboard.page.projects")
      case "admin":
        return t("dashboard.page.admin")
      case "users":
        return t("dashboard.page.users")
      case "sandbox-management":
        return t("dashboard.page.sandboxManagement")
      case "admin-billing":
        return t("dashboard.page.adminBilling")
      case "system":
        return t("dashboard.page.system")
      case "api-key":
        return t("dashboard.page.apiKey")
      case "budget":
        return t("dashboard.page.budget")
      case "billings":
        return t("dashboard.page.billings")
      default:
        return isAdmin ? t("dashboard.page.admin") : t("dashboard.page.projects")
    }
  }

  // Render based on authentication state
  switch (authState) {
    case "landing":
      return <LandingPage onSignIn={() => setAuthState("signin")} onSignUp={() => setAuthState("signup")} />

    case "signin":
      return (
        <SignInPage
          ref={signinRef}
          onSignIn={handleSignIn}
          onBackToLanding={() => setAuthState("landing")}
          onSwitchToSignUp={() => setAuthState("signup")}
          onForgotPassword={() => setAuthState("reset-password-request")}
        />
      )

    case "signup":
      return (
        <SignUpPage
          ref={signupRef}
          onSignUp={handleSignUp}
          onBackToLanding={() => setAuthState("landing")}
          onSwitchToSignIn={() => setAuthState("signin")}
        />
      )

    case "verification":
      return verificationData ? (
        <VerificationPage
          email={verificationData.email}
          onVerify={handleVerification}
          onResend={handleResendVerification}
          onBackToSignUp={async () => {
            // Cleanup failed signup if needed
            if (verificationData) {
              try {
                await UserService.cleanupFailedSignup(verificationData.email)
              } catch (error) {
                console.error("Failed to cleanup signup:", error)
              }
            }
            setVerificationData(null)
            setAuthState("signup")
          }}
        />
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p>No verification data found. Please try signing up again.</p>
            <Button onClick={() => setAuthState("signup")} className="mt-4">
              Go to Sign Up
            </Button>
          </div>
        </div>
      )

          case "reset-password-request":
        return (
          <ResetPasswordRequest
            onBackToSignIn={() => setAuthState("signin")}
          />
        )

      case "reset-password-confirm":
        return resetToken ? (
          <ResetPasswordConfirm
            token={resetToken}
            onBackToSignIn={() => {
              setResetToken(null)
              setAuthState("signin")
            }}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p>Invalid reset link. Please try requesting a new one.</p>
              <Button onClick={() => setAuthState("reset-password-request")} className="mt-4">
                Request Reset Link
              </Button>
            </div>
          </div>
      )

    case "authenticated":
      return (
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className="relative bg-card border-r border-border flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ width: `${sidebarWidth}px` }}
          >
            <Sidebar
              currentPage={currentPage}
              onPageChange={handlePageChange}
              isCollapsed={isCollapsed}
              onToggleCollapse={toggleCollapse}
              sidebarWidth={sidebarWidth}
              onLogout={handleLogout}
              isAdmin={isAdmin}
              isRootUser={isRootUser}
            />

            {/* Resize Handle */}
            {!isCollapsed && (
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-primary transition-colors duration-200"
                onMouseDown={startResizing}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-0.5 h-8 bg-border hover:bg-primary transition-colors duration-200"></div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header - Match sidebar header height */}
            <header className="bg-card border-b border-border px-6 py-4 h-[73px] flex items-center">
              <div className="flex items-center justify-between w-full">
                {/* Page Title */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
                </div>
                
                {/* User Indicator */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted border mx-4 h-10">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {currentUser?.display_name || currentUser?.username || currentUser?.email?.split('@')[0] || 'User'}
                      </span>
                      {isRootUser && (
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Root</span>
                      )}
                      {!isRootUser && currentUser?.role && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{currentUser.role}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      Account ID: {currentUser?.account_id || currentUser?.id || 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <LanguageToggle />
                  <ThemeToggle />
                  <NotificationButton />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAccountSettingsOpen(true)}
                    className="relative"
                  >
                    <User className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">{t("dashboard.accountSettings")}</span>
                  </Button>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-auto p-6 bg-background">{renderPage()}</main>
          </div>

          {/* Account Settings Modal */}
          <AccountSettings 
            isOpen={isAccountSettingsOpen} 
            onClose={() => setIsAccountSettingsOpen(false)}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
          />

          {/* Resize cursor overlay */}
          {isResizing && <div className="fixed inset-0 cursor-col-resize z-50" style={{ pointerEvents: "none" }} />}
        </div>
      )

    default:
      return null
  }
}

export default function Dashboard() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="dashboard-theme">
      <DashboardContent />
    </ThemeProvider>
  )
}
