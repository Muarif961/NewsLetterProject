import { Server, Socket } from "socket.io";
import { db } from "../db/index";
import { notifications } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export function setupWebSockets(io: Server) {
  // Store user connections
  const userConnections = new Map<number, Set<Socket>>();

  // Configure engine options
  io.engine.opts.pingInterval = 25000;
  io.engine.opts.pingTimeout = 10000;
  io.engine.opts.maxPayload = 100000;

  // Configure socket server options using engine.io options
  io.engine.opts.transports = ['websocket'];
  io.engine.opts.pingTimeout = 30000;
  io.engine.opts.pingInterval = 25000;

  io.on("connection", (socket) => {
    // Enable heartbeat
    let heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 25000);

    socket.on('pong', () => {
      // Client is alive
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    });
    console.log("[WebSocket] New client connected");

    // Handle user authentication
    socket.on("authenticate", async (userId: number) => {
      try {
        // Validate userId
        if (!userId || typeof userId !== "number") {
          console.error("[WebSocket] Invalid user ID:", userId);
          return;
        }

        // Add socket to user's connections
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId)?.add(socket);
        console.log(`[WebSocket] User ${userId} authenticated successfully`);

        try {
          // Verify notifications table exists
          const tableExists = await db.execute(sql`SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'notifications'
          )`);

          if (!tableExists) {
            throw new Error("Notifications table does not exist");
          }

          // Send unread notifications on connection
          const unreadNotifications = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt));

          socket.emit("notifications", unreadNotifications);
          console.log(
            `[WebSocket] Successfully sent ${unreadNotifications.length} notifications to user ${userId}`,
          );
        } catch (error) {
          console.error(
            "[WebSocket] Database error fetching notifications:",
            error,
          );
          socket.emit("error", {
            message: "Failed to fetch notifications",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } catch (error) {
        console.error("[WebSocket] Authentication error:", error);
        socket.emit("error", {
          message: "Authentication failed",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      try {
        // Remove socket from all user connections
        for (const [userId, sockets] of userConnections.entries()) {
          if (sockets.has(socket)) {
            sockets.delete(socket);
            if (sockets.size === 0) {
              userConnections.delete(userId);
            }
            console.log(`[WebSocket] Client disconnected from user ${userId}`);
            break;
          }
        }
      } catch (error) {
        console.error("[WebSocket] Error handling disconnect:", error);
      }
    });

    // Handle marking notifications as read
    socket.on("markAsRead", async (notificationId: number) => {
      try {
        // Validate notificationId
        if (!notificationId || typeof notificationId !== "number") {
          console.error("[WebSocket] Invalid notification ID:", notificationId);
          socket.emit("error", { message: "Invalid notification ID" });
          return;
        }

        // Verify the notification exists before deletion
        const [notification] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, notificationId))
          .limit(1);

        if (!notification) {
          console.error("[WebSocket] Notification not found:", notificationId);
          socket.emit("error", { message: "Notification not found" });
          return;
        }

        await db
          .delete(notifications)
          .where(eq(notifications.id, notificationId));

        console.log(
          `[WebSocket] Successfully deleted notification ${notificationId}`,
        );
        socket.emit("notificationDeleted", { id: notificationId });

        // Emit updated notifications list to keep client in sync
        const updatedNotifications = await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, notification.userId))
          .orderBy(desc(notifications.createdAt));

        socket.emit("notifications", updatedNotifications);
      } catch (error) {
        console.error("[WebSocket] Error handling markAsRead:", error);
        socket.emit("error", {
          message: "Failed to delete notification",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  });

  // Function to send notification to a specific user
  const sendNotification = async (userId: number, notification: any) => {
    try {
      // Validate input
      if (!userId || !notification?.type || !notification?.message) {
        throw new Error("Invalid notification data");
      }

      const [created] = await db
        .insert(notifications)
        .values({
          userId,
          type: notification.type,
          message: notification.message,
          detail: notification.detail,
        })
        .returning();

      console.log(
        `[WebSocket] Successfully created notification for user ${userId}:`,
        created,
      );

      const userSockets = userConnections.get(userId);
      if (userSockets) {
        for (const socket of userSockets) {
          socket.emit("notification", created);
        }
        console.log(
          `[WebSocket] Notification sent to ${userSockets.size} connected clients`,
        );
      } else {
        console.log(`[WebSocket] No active connections for user ${userId}`);
      }

      return created;
    } catch (error) {
      console.error("[WebSocket] Error in sendNotification:", error);
      throw error;
    }
  };

  const emitNewsletterUpdate = (type: string, data: any = null) => {
    io.emit(`newsletter:${type}`, data);
    io.emit("activity:update");
  };

  const emitSubscriberUpdate = (data: any = null) => {
    io.emit("subscriber:created", data);
    io.emit("activity:update");
  };

  const emitTemplateUpdate = (data: any = null) => {
    io.emit("template:created", data);
    io.emit("activity:update");
  };

  return {
    sendNotification,
    emitNewsletterUpdate,
    emitSubscriberUpdate,
    emitTemplateUpdate,
  };
}