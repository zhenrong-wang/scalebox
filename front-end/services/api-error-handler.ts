// Global API error handler for account suspension
export function handleApiError(response: Response): void {
  if (response.status === 403) {
    // Check if it's an account suspension
    response.clone().json().then((errorData) => {
      if (errorData.account_suspended) {
        // Store suspended account info
        localStorage.setItem("user-data", JSON.stringify({
          account_suspended: true,
          account_name: errorData.account_name || "Unknown Account"
        }));
        // Redirect to suspension page
        if (typeof window !== "undefined") {
          window.location.href = "/account-suspended";
        }
      }
    }).catch(() => {
      // If we can't parse the error, still redirect to be safe
      if (typeof window !== "undefined") {
        window.location.href = "/account-suspended";
      }
    });
  }
}

// Wrapper for fetch that handles account suspension
export async function fetchWithSuspensionHandling(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options);
  
  if (response.status === 403) {
    handleApiError(response);
  }
  
  return response;
} 