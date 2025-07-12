"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, X, Trash2, Eye, EyeOff, CheckCheck, Circle, CheckCircle, CircleDot, Info, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { notificationService, type Notification } from "@/services/notification-service";

export function NotificationButton() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications({ limit: 50 });
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(n => n !== id)
        : [...prev, id]
    );
  };

  // --- Fix mark as read/unread logic: use string IDs, update unread count correctly ---
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      // Only decrement if it was unread
      if (!notifications.find(n => n.id === id)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast({
        title: t("notifications.markedAsRead"),
        description: t("notifications.markedAsReadDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.markAsReadError"),
        variant: "destructive",
      });
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      await notificationService.markAsUnread(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
      // Only increment if it was read
      if (notifications.find(n => n.id === id)?.is_read) {
        setUnreadCount(prev => prev + 1);
      }
      toast({
        title: t("notifications.markedAsUnread"),
        description: t("notifications.markedAsUnreadDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.markAsUnreadError"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setSelectedNotifications(prev => prev.filter(n => n !== id));
      if (!notifications.find(n => n.id === id)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast({
        title: t("notifications.deleted"),
        description: t("notifications.deletedDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.deleteError"),
        variant: "destructive",
      });
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    setIsLoading(true);
    try {
      await notificationService.markMultipleAsRead(selectedNotifications);
      setNotifications(prev =>
        prev.map(n => selectedNotifications.includes(n.id) ? { ...n, is_read: true } : n)
      );
      const newlyReadCount = selectedNotifications.filter(id =>
        !notifications.find(n => n.id === id)?.is_read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - newlyReadCount));
      setSelectedNotifications([]);
      toast({
        title: t("notifications.bulkMarkedAsRead"),
        description: t("notifications.bulkMarkedAsReadDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.bulkMarkAsReadError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedNotifications.length === 0) return;
    setIsLoading(true);
    try {
      await notificationService.markMultipleAsUnread(selectedNotifications);
      setNotifications(prev =>
        prev.map(n => selectedNotifications.includes(n.id) ? { ...n, is_read: false } : n)
      );
      const newlyUnreadCount = selectedNotifications.filter(id =>
        notifications.find(n => n.id === id)?.is_read
      ).length;
      setUnreadCount(prev => prev + newlyUnreadCount);
      setSelectedNotifications([]);
      toast({
        title: t("notifications.bulkMarkedAsUnread"),
        description: t("notifications.bulkMarkedAsUnreadDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.bulkMarkAsUnreadError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    setIsLoading(true);
    try {
      await notificationService.deleteMultipleNotifications(selectedNotifications);
      const deletedUnreadCount = selectedNotifications.filter(id =>
        !notifications.find(n => n.id === id)?.is_read
      ).length;
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount));
      setSelectedNotifications([]);
      toast({
        title: t("notifications.bulkDeleted"),
        description: t("notifications.bulkDeletedDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.bulkDeleteError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    setIsLoading(true);
    try {
      const allIds = notifications.map(n => n.id);
      await notificationService.deleteMultipleNotifications(allIds);
      setNotifications([]);
      setUnreadCount(0);
      setSelectedNotifications([]);
      toast({
        title: t("notifications.clearedAll"),
        description: t("notifications.clearedAllDesc"),
      });
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.clearAllError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t("notifications.justNow");
    if (diffInMinutes < 60) return t("notifications.minutesAgo", { minutes: diffInMinutes });
    if (diffInMinutes < 1440) return t("notifications.hoursAgo", { hours: Math.floor(diffInMinutes / 60) });
    return t("notifications.daysAgo", { days: Math.floor(diffInMinutes / 1440) });
  };

  // --- Icon redesign ---
  // Status icon: unread = filled blue dot, read = gray outlined circle
  const getStatusIcon = (is_read: boolean) => {
    return is_read ? (
      <Circle className="h-3 w-3 text-gray-400" strokeWidth={2} fill="none" />
    ) : (
      <Circle className="h-3 w-3 text-blue-500" strokeWidth={0} fill="#3b82f6" />
    );
  };

  // Type icon: info, success, error, warning
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  // Operation icons: mark as read/unread, delete
  const getMarkAsReadIcon = () => <CheckCircle className="h-3 w-3 text-green-600" />;
  const getMarkAsUnreadIcon = () => <CircleDot className="h-3 w-3 text-blue-600" />;
  const getDeleteIcon = () => <Trash2 className="h-3 w-3 text-red-600" />;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col h-96">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">{t("notifications.title")}</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isLoading}
                  className="h-8 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t("notifications.clearAll")}
                </Button>
              )}
            </div>
          </div>

          {/* Batch Operations */}
          {notifications.length > 0 && (
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">
                    {t("notifications.selectAll")}
                  </span>
                </div>
                
                {selectedNotifications.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkMarkAsRead}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 hover:bg-green-100"
                      title={t("notifications.markAsRead")}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkMarkAsUnread}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                      title={t("notifications.markAsUnread")}
                    >
                      <CircleDot className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                      title={t("notifications.deleteSelected")}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">{t("notifications.noNotifications")}</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedNotifications.includes(notification.id)}
                        onCheckedChange={() => handleSelectNotification(notification.id)}
                        className="h-4 w-4 mt-0.5"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getStatusIcon(notification.is_read)}
                            {getTypeIcon(notification.type)}
                            <h4 className={`font-medium text-sm truncate ${
                              !notification.is_read ? "font-semibold" : ""
                            }`}>
                              {notification.title}
                            </h4>
                            {notification.is_read && (
                              <CheckCheck className="h-3 w-3 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.is_read ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="h-6 w-6 p-0 hover:bg-green-100"
                                title={t("notifications.markAsRead")}
                              >
                                {getMarkAsReadIcon()}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsUnread(notification.id)}
                                className="h-6 w-6 p-0 hover:bg-blue-100"
                                title={t("notifications.markAsUnread")}
                              >
                                {getMarkAsUnreadIcon()}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="h-6 w-6 p-0 hover:bg-red-100"
                              title={t("notifications.delete")}
                            >
                              {getDeleteIcon()}
                            </Button>
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 text-muted-foreground ${
                          !notification.is_read ? "font-medium" : ""
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">
                              {t("notifications.unread")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 