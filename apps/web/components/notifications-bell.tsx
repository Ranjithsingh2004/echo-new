"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";
import { Badge } from "@workspace/ui/components/badge";
import {
  BellIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  RefreshCwIcon,
  TrashIcon,
  CheckCheckIcon,
  Trash2Icon,
  BellOffIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Id } from "@workspace/backend/_generated/dataModel";

export const NotificationsBell = () => {
  const notifications = useQuery(api.private.notifications.list, { limit: 10 });
  const unreadCount = useQuery(api.private.notifications.getUnreadCount);
  const markAsRead = useMutation(api.private.notifications.markAsRead);
  const markAllAsRead = useMutation(api.private.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.private.notifications.deleteNotification);
  const deleteAll = useMutation(api.private.notifications.deleteAll);
  const retryFile = useMutation(api.private.files.retryFileProcessing);

  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const result = await deleteAll();
      toast.success(`Cleared ${result.deleted} notifications`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear notifications");
    }
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    try {
      await deleteNotification({ notificationId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete notification");
    }
  };

  const handleRetry = async (fileId: string) => {
    try {
      await retryFile({ entryId: fileId as any });
      toast.success("Retrying file processing...");
    } catch (error) {
      console.error(error);
      toast.error("Failed to retry file processing");
    }
  };

  const getIcon = (type: "file_ready" | "file_failed" | "file_processing") => {
    switch (type) {
      case "file_ready":
        return <CheckCircle2Icon className="h-4 w-4 text-green-500" />;
      case "file_failed":
        return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      case "file_processing":
        return <RefreshCwIcon className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount !== undefined && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheckIcon className="h-3 w-3 mr-1" />
                Mark read
              </Button>
            )}
            {hasNotifications && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                onClick={handleDeleteAll}
                title="Clear all notifications"
              >
                <Trash2Icon className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {!hasNotifications ? (
            <div className="px-4 py-12 text-center">
              <BellOffIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`px-2 py-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.read ? "bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-500" : ""
                }`}
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification._id);
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {formatDistanceToNow(notification.createdAt, {
                        addSuffix: true,
                      })}
                    </p>
                    {notification.type === "file_failed" && notification.fileId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs mt-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(notification.fileId!);
                        }}
                      >
                        <RefreshCwIcon className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                    title="Delete notification"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
