import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { socket } from "@/lib/socket";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  type: string;
  message: string;
  detail?: string;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<Set<number>>(new Set());
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    console.log("[Notifications] Setting up WebSocket connection for user", user.id);
    
    // Connect to WebSocket and authenticate
    socket.connect();
    socket.emit("authenticate", user.id);

    // Handle initial notifications
    socket.on("notifications", (initialNotifications: Notification[]) => {
      console.log("[Notifications] Received initial notifications:", initialNotifications);
      setNotifications(initialNotifications);
    });

    // Handle new notifications
    socket.on("notification", (notification: Notification) => {
      console.log("[Notifications] Received new notification:", notification);
      setNotifications((prev) => {
        const newNotifications = [notification, ...prev];
        console.log("[Notifications] Updated notifications list:", newNotifications);
        return newNotifications;
      });
    });

    // Handle deleted notifications
    socket.on("notificationDeleted", ({ id }: { id: number }) => {
      console.log("[Notifications] Deleting notification:", id);
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== id);
        console.log("[Notifications] Updated notifications after deletion:", filtered);
        return filtered;
      });
      setPendingDeletions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    });

    // Handle error messages
    socket.on("error", ({ message, details }: { message: string; details?: string }) => {
      console.error("[Notifications] WebSocket error:", message, details);
      toast({
        title: "Notification Error",
        description: message,
        variant: "destructive",
      });
      // Remove failed notifications from pending state
      setPendingDeletions(new Set());
    });

    return () => {
      socket.disconnect();
    };
  }, [user, toast]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      // Add to pending deletions
      setPendingDeletions((prev) => new Set([...prev, notificationId]));
      
      // Emit markAsRead event
      socket.emit("markAsRead", notificationId);
      
      // Set a timeout to handle cases where the server doesn't respond
      setTimeout(() => {
        setPendingDeletions((prev) => {
          if (prev.has(notificationId)) {
            toast({
              title: "Error",
              description: "Failed to mark notification as read. Please try again.",
              variant: "destructive",
            });
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          }
          return prev;
        });
      }, 5000); // 5 second timeout
    } catch (error) {
      console.error("[Notifications] Error marking notification as read:", error);
      setPendingDeletions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      toast({
        title: "Error",
        description: "Failed to mark notification as read. Please try again.",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start space-y-1 p-4 ${
                !notification.read ? "bg-accent/50" : ""
              } ${pendingDeletions.has(notification.id) ? "opacity-50" : ""}`}
              onClick={() => {
                if (!pendingDeletions.has(notification.id)) {
                  handleMarkAsRead(notification.id);
                }
              }}
              disabled={pendingDeletions.has(notification.id)}
            >
              <div className="font-medium">{notification.message}</div>
              {notification.detail && (
                <div className="text-sm text-muted-foreground">
                  {notification.detail}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString()}
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
