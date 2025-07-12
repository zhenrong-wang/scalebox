// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth-token')
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  }
}

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export interface Notification {
  id: string;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface NotificationFilters {
  is_read?: boolean;
  skip?: number;
  limit?: number;
}

export class NotificationService {
  private baseUrl = `${API_BASE_URL}/api/notifications`;

  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    
    if (filters.is_read !== undefined) params.append('is_read', filters.is_read.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}/?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async getNotification(id: string): Promise<Notification> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async markAsRead(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async markAsUnread(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}/unread`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async markAllAsRead(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async deleteNotification(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async deleteAllNotifications(): Promise<{ message: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async deleteMultipleNotifications(ids: string[]): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/bulk-delete`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: ids }),
    });

    return handleResponse(response);
  }

  async markMultipleAsRead(ids: string[]): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/bulk-read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: ids }),
    });

    return handleResponse(response);
  }

  async markMultipleAsUnread(ids: string[]): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/bulk-unread`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notification_ids: ids }),
    });

    return handleResponse(response);
  }

  // Admin endpoints
  async sendNotification(userId: number, data: {
    title: string;
    message: string;
    notification_type?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }): Promise<{ message: string; notification_id: string }> {
    const params = new URLSearchParams();
    params.append('user_id', userId.toString());
    params.append('title', data.title);
    params.append('message', data.message);
    if (data.notification_type) params.append('notification_type', data.notification_type);
    if (data.related_entity_type) params.append('related_entity_type', data.related_entity_type);
    if (data.related_entity_id) params.append('related_entity_id', data.related_entity_id);

    const response = await fetch(`${this.baseUrl}/admin/send?${params.toString()}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async broadcastNotification(data: {
    title: string;
    message: string;
    notification_type?: string;
    related_entity_type?: string;
    related_entity_id?: string;
  }): Promise<{ message: string }> {
    const params = new URLSearchParams();
    params.append('title', data.title);
    params.append('message', data.message);
    if (data.notification_type) params.append('notification_type', data.notification_type);
    if (data.related_entity_type) params.append('related_entity_type', data.related_entity_type);
    if (data.related_entity_id) params.append('related_entity_id', data.related_entity_id);

    const response = await fetch(`${this.baseUrl}/admin/broadcast?${params.toString()}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  async getUserNotifications(userId: number, filters: NotificationFilters = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${this.baseUrl}/admin/user/${userId}?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  // Helper methods
  getNotificationIcon(type: Notification['type']): string {
    switch (type) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return '📢';
    }
  }

  async createDemoNotifications(): Promise<{ message: string; count: number }> {
    const response = await fetch(`${this.baseUrl}/demo`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }

  getNotificationColor(type: Notification['type']): string {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  isRecent(dateString: string, hours: number = 24): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffInHours < hours;
  }
}

export const notificationService = new NotificationService(); 