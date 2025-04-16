import { Request, Response } from "express";
import { NotificationService } from "../lib/notifications";
import { db } from "../db/index";
import { api_keys } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const apiKeysSchema = z.object({
  openai_key: z.string().nullable(),
  news_api_key: z.string().nullable(),
  use_custom_openai: z.boolean(),
  use_custom_news_api: z.boolean(),
});

export async function getApiKeys(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [settings] = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.userId, req.user.id))
      .limit(1);

    res.json({
      success: true,
      data: settings
        ? {
            openai_key: settings.openaiKey,
            news_api_key: settings.newsApiKey,
            use_custom_openai: settings.useCustomOpenai,
            use_custom_news_api: settings.useCustomNewsApi,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error fetching API keys:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch API keys",
      details: error.code,
    });
  }
}

export async function updateApiKeys(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = apiKeysSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid API key settings",
        errors: validation.error.flatten(),
      });
    }

    // First try to find existing settings
    const [existingSettings] = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.userId, req.user.id))
      .limit(1);

    let result;
    if (existingSettings) {
      // Update existing settings
      [result] = await db
        .update(api_keys)
        .set({
          openaiKey: validation.data.openai_key,
          newsApiKey: validation.data.news_api_key,
          useCustomOpenai: validation.data.use_custom_openai,
          useCustomNewsApi: validation.data.use_custom_news_api,
          updatedAt: new Date(),
        })
        .where(eq(api_keys.userId, req.user.id))
        .returning();
    } else {
      // Insert new settings
      [result] = await db
        .insert(api_keys)
        .values({
          userId: req.user.id,
          openaiKey: validation.data.openai_key,
          newsApiKey: validation.data.news_api_key,
          useCustomOpenai: validation.data.use_custom_openai,
          useCustomNewsApi: validation.data.use_custom_news_api,
        })
        .returning();
    }

    // Create notification for API keys update
    await NotificationService.createNotification(
      req.user.id,
      "system",
      "API keys updated",
      "API keys configuration has been updated successfully",
    );

    return res.json({
      success: true,
      message: "API keys saved successfully",
      data: {
        openai_key: result.openaiKey,
        news_api_key: result.newsApiKey,
        use_custom_openai: result.useCustomOpenai,
        use_custom_news_api: result.useCustomNewsApi,
      },
    });
  } catch (error: any) {
    console.error("Error updating API keys:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update API keys",
      details: error.code,
    });
  }
}
export async function testGptConfiguration(req: Request, res: Response) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { url, key } = req.body;

    if (!url || !key) {
      return res.status(400).json({
        success: false,
        message: "URL and API key are required",
      });
    }

    // Test the configuration with a simple completion request
    try {
      const response = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        return res.json({
          success: true,
          message: "Custom GPT configuration is working",
        });
      } else {
        throw new Error("Invalid response from GPT service");
      }
    } catch (error) {
      throw new Error(
        `Failed to connect to Custom GPT service: ${error.message}`,
      );
    }
  } catch (error: any) {
    console.error("Error testing GPT configuration:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to test GPT configuration",
    });
  }
}
