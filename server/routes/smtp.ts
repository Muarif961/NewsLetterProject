import { Request, Response } from "express";
import { NotificationService } from "../lib/notifications";
import { db } from "../db/index";
import { verified_emails } from "../db/schema";
import { eq } from "drizzle-orm";
import { verifyEmailIdentity, checkVerificationStatus, sendTestEmail } from "../lib/email";
import { z } from "zod";

const verifyEmailSchema = z.object({
  email: z.string().email("Valid email address is required"),
});

export async function getVerifiedEmails(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const verifiedEmails = await db
      .select()
      .from(verified_emails)
      .where(eq(verified_emails.userId, req.user.id));

    res.json({
      success: true,
      data: verifiedEmails,
    });
  } catch (error: any) {
    console.error("Error fetching verified emails:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch verified emails",
      details: error.code,
    });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        errors: validation.error.flatten(),
      });
    }

    const result = await verifyEmailIdentity(req.user.id, validation.data.email);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to start email verification",
      });
    }

    // Create notification for verification initiation
    await NotificationService.createNotification(
      req.user.id,
      "system",
      "Email verification initiated",
      `Verification email sent to ${validation.data.email}. Please check your inbox.`
    );

    res.json({
      success: true,
      message: result.message || "Verification email sent successfully",
    });
  } catch (error: any) {
    console.error("Error initiating email verification:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate email verification",
      details: error.code,
    });
  }
}

export async function checkEmailVerification(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required",
      });
    }

    const result = await checkVerificationStatus(req.user.id, email);

    if (result.status === 'verified') {
      await NotificationService.createNotification(
        req.user.id,
        "system",
        "Email verified",
        `${email} has been successfully verified and is ready to use.`
      );
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error checking verification status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check verification status",
      details: error.code,
    });
  }
}

export async function testEmailSettings(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const result = await sendTestEmail(req.user.id, email);
    await NotificationService.createNotification(
      req.user.id,
      "system",
      "Test email sent",
      `Test email successfully sent to ${email}`
    );

    res.json({
      success: true,
      message: "Test email sent successfully",
      info: result.info,
    });
  } catch (error: any) {
    console.error("Error sending test email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send test email",
      error: error.message,
    });
  }
}