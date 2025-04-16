import express, { Request, Response } from "express";
import { enhanceText } from "../lib/ai";

const router = express.Router();

/**
 * Text Enhancement with Credit Validation and Deduction
 *
 * Enhances the provided text based on user instructions.
 * Validates credit availability before processing.
 * Deducts credits based on token usage.
 */
router.post("/text-enhancement", async (req: Request, res: Response) => {
  try {
    // Extract request data
    const { originalText, instructions, userId: bodyUserId } = req.body;
    const headerUserId = req.headers['x-user-id'];
    const sessionUserId = req.user?.id;
    
    // Try to get userId from multiple sources
    const userId = sessionUserId || bodyUserId || headerUserId;

    // // Log for debugging
    // console.log('User ID sources:', {
    //   session: sessionUserId,
    //   body: bodyUserId,
    //   header: headerUserId,
    //   final: userId
    // });

    // Validate request
    if (!originalText || !instructions) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "Both originalText and instructions are required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to use this feature",
      });
    }

    // Log the request data
    console.log("Text enhancement request:");
    console.log("- User ID:", userId);
    console.log("- Original text length:", originalText.length);
    console.log("- Instructions:", instructions);

    // Process text enhancement with credit integration
    const result = await enhanceText(userId, originalText, instructions);

    // Return the enhanced text and usage data
    res.json({
      enhancedText: result.enhancedText,
      success: true,
      usage: result.usage,
    });
  } catch (error: any) {
    console.error("Error enhancing text:", error);

    // Handle different types of errors
    if (error.message && error.message.includes("Insufficient credits")) {
      return res.status(402).json({
        error: "Insufficient credits",
        details: error.message,
        creditsRequired: true,
      });
    }

    if (error.code === "insufficient_quota") {
      return res.status(402).json({
        error: "API quota exceeded",
        details: "Unable to enhance text at this time",
      });
    }

    if (error.code === "invalid_input") {
      return res.status(400).json({
        error: "Invalid input",
        details: error.message,
      });
    }

    // Generic error response
    res.status(500).json({
      error: "Failed to enhance text",
      details: error.message || "Unknown error",
    });
  }
});

export default router;
