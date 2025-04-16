import { db } from "../db/index";
import { notifications } from "../db/schema";
import { eq, lt, desc } from "drizzle-orm";

export const NotificationService = {
  async createNotification(
    userId: number,
    type: string,
    message: string,
    detail?: string,
  ) {
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          userId,
          type,
          message,
          detail,
        })
        .returning();

      console.log(
        `[Notifications] Created notification for user ${userId}:`,
        notification,
      );
      return { success: true, notification };
    } catch (error) {
      console.error("[Notifications] Error creating notification:", error);
      return { success: false, error: "Failed to create notification" };
    }
  },

  async getUnreadNotifications(userId: number) {
    try {
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      console.log(
        `[Notifications] Retrieved ${result.length} notifications for user ${userId}`,
      );
      return result;
    } catch (error) {
      console.error("[Notifications] Error fetching notifications:", error);
      throw error;
    }
  },

  async markAsRead(notificationId: number) {
    try {
      await db
        .delete(notifications)
        .where(eq(notifications.id, notificationId));
      console.log(
        `[Notifications] Marked notification ${notificationId} as read`,
      );
      return { success: true };
    } catch (error) {
      console.error("[Notifications] Error deleting notification:", error);
      return { success: false, error: "Failed to delete notification" };
    }
  },

  async cleanupOldNotifications() {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const result = await db
        .delete(notifications)
        .where(lt(notifications.createdAt, oneDayAgo))
        .returning();

      console.log(
        `[Notifications] Cleaned up ${result.length} old notifications`,
      );
      return { success: true, count: result.length };
    } catch (error) {
      console.error(
        "[Notifications] Error cleaning up old notifications:",
        error,
      );
      return { success: false, error: "Failed to cleanup old notifications" };
    }
  },
};

// Run cleanup every hour
setInterval(() => {
  NotificationService.cleanupOldNotifications();
}, 3600000);

export default NotificationService;
