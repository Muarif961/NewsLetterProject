import express from "express";
import {
  getNewsContent,
  getSelectedArticles,
  generateAINewsletter,
} from "../newsletter";
import OpenAI from "openai";
import { configDotenv } from "dotenv";

configDotenv();

const router = express.Router();

// Initialize OpenAI with proper error handling and logging
let openai: OpenAI | null = null;
try {
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(
    "Initializing OpenAI with API key format:",
    apiKey ? `${apiKey.substring(0, 7)}...` : "undefined",
  );

  if (!apiKey) {
    console.error("OpenAI API key is not set in environment variables");
  } else {
    openai = new OpenAI({ apiKey });
    console.log("OpenAI client initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// Check Event Registry API key
if (!process.env.EVENT_REGISTRY_API_KEY) {
  console.error("EVENT_REGISTRY_API_KEY is not configured");
}

// Map our categories to Event Registry category URIs
const categoryMapping = {
  technology: "news/Technology",
  business: "news/Business",
  entertainment: "news/Arts_and_Entertainment",
  health: "news/Health",
  science: "news/Science",
  sports: "news/Sports",
  environment: "news/Environment",
  finance: "news/Finance",
};

// Source type mapping
const sourceTypeMapping = {
  mainstream: "news",
  blogs: "blog",
  press: "pr",
};

const validCategories = Object.keys(categoryMapping);
const validSourceTypes = Object.keys(sourceTypeMapping);

// Helper function to map categories to URIs
function mapCategoriesToUris(categories: string[]): string[] {
  return categories
    .map((cat) => categoryMapping[cat.toLowerCase()] || "")
    .filter(Boolean);
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper function to validate date range
function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  return start <= end && end <= now;
}

// Route for getting news preview for the modal
router.post("/preview", async (req, res) => {
  try {
    const {
      categories,
      dateRange, // Optional: { startDate: string, endDate: string }
      location, // Optional: { country: string, city: string }
      sourceTypes, // Optional: Array of source types
    } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: "Please provide at least one category",
      });
    }

    // Validate categories
    const invalidCategories = categories.filter(
      (cat) => !validCategories.includes(cat.toLowerCase()),
    );

    if (invalidCategories.length > 0) {
      return res.status(400).json({
        error: `Invalid categories: ${invalidCategories.join(", ")}. Valid categories are: ${validCategories.join(", ")}`,
      });
    }

    // Validate source types if provided
    if (sourceTypes && Array.isArray(sourceTypes)) {
      const invalidSourceTypes = sourceTypes.filter(
        (type) => !validSourceTypes.includes(type.toLowerCase()),
      );
      if (invalidSourceTypes.length > 0) {
        return res.status(400).json({
          error: `Invalid source types: ${invalidSourceTypes.join(", ")}. Valid types are: ${validSourceTypes.join(", ")}`,
        });
      }
    }

    // Validate date range if provided
    if (dateRange) {
      if (!validateDateRange(dateRange.startDate, dateRange.endDate)) {
        return res.status(400).json({
          error:
            "Invalid date range. Start date must be before end date and end date cannot be in the future.",
        });
      }
    }

    const mappedCategories = categories.map(
      (cat) => categoryMapping[cat.toLowerCase()],
    );
    console.log("Mapped categories for Event Registry:", mappedCategories);

    // Get preview content for the modal with additional parameters
    const articles = await getNewsContent(
      mappedCategories,
      dateRange,
      location,
      sourceTypes?.map((type) => sourceTypeMapping[type.toLowerCase()]),
    );

    // Return only preview information
    const previewArticles = articles.map((article) => ({
      url: article.url,
      title: article.title,
      description: article.description,
      source: article.source,
      publishedAt: article.publishedAt,
      category: article.category,
      location: article.location,
      sourceType: article.sourceType,
      selected: false,
    }));

    res.json(previewArticles);
  } catch (error) {
    console.error("Error fetching news preview:", error);
    res.status(500).json({
      error: "Failed to fetch news preview",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Modified chat route with enhanced error handling
router.post("/chat", async (req, res) => {
  try {
    // Check both API keys
    const missingKeys = [];
    if (!openai) {
      missingKeys.push("OpenAI");
    }
    if (!process.env.EVENT_REGISTRY_API_KEY) {
      missingKeys.push("Event Registry");
    }

    if (missingKeys.length > 0) {
      return res.status(503).json({
        error: "News service is currently unavailable",
        details: `Missing or invalid API keys: ${missingKeys.join(", ")}. Please ensure all required API keys are properly configured.`,
      });
    }

    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        error: "Please provide a search query",
      });
    }

    console.log("Processing query:", query);

    // Process the query to extract key terms
    const processedQuery = query.toLowerCase()
      .replace(/top\s+\d+\s+/i, '') // Remove "top X" from query
      .replace(/this\s+week/i, '') // Remove time references
      .trim();

    try {
      const response = await fetch(
        "https://eventregistry.org/api/v1/article/getArticles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "getArticles",
            keyword: processedQuery,
            articlesPage: 1,
            articlesCount: 10,
            articlesSortBy: "date",
            apiKey: process.env.EVENT_REGISTRY_API_KEY,
            forceMaxDataTimeWindow: 7, // Limit to last 7 days for more recent results
            resultType: "articles",
            dataType: ["news"],
            lang: "eng",
            isDuplicateFilter: "skipDuplicates", // Skip duplicate articles
            sortBy: "date", // Sort by date to get most recent first
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Event Registry API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Event Registry API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.articles || !Array.isArray(data.articles.results)) {
        console.error("Invalid API response format:", data);
        throw new Error("Invalid response format from Event Registry API");
      }

      // Transform and filter articles
      const articles = data.articles.results
        .filter((article) => article.title && article.body)
        .map((article) => ({
          title: article.title,
          content: article.body,
          source: article.source?.title || "Unknown Source",
          publishedAt: article.dateTime,
          sourceUrl: article.url,
          category: article.categories?.[0]?.label || "General",
          location: article.location?.join(", ") || null,
          sourceType: article.source?.dataType || "news",
        }));

      if (articles.length === 0) {
        return res.json({
          query,
          articles: [],
          message: "No articles found for your query. Try modifying your search terms or broadening the topic."
        });
      }

      res.json({
        query,
        articles,
      });
    } catch (apiError) {
      console.error("API error:", apiError);
      throw new Error(`API error: ${apiError.message}`);
    }
  } catch (error) {
    console.error("Error processing chat query:", error);
    res.status(500).json({
      error: "Failed to process query",
      details: error instanceof Error ? error.message : "Unknown error",
      suggestion: "Try rephrasing your query or using different keywords."
    });
  }
});

// Route for generating AI newsletter
router.post("/generate", async (req, res) => {
  try {
    const { categories, includeImages = true } = req.body;
    const userId = req.user?.id;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: "Please provide at least one category",
      });
    }

    const mappedCategories = categories
      .filter((cat) => validCategories.includes(cat.toLowerCase()))
      .map((cat) => categoryMapping[cat.toLowerCase()]);

    if (mappedCategories.length === 0) {
      return res.status(400).json({
        error: `Invalid categories. Valid categories are: ${validCategories.join(", ")}`,
      });
    }

    console.log("Generating newsletter with images:", includeImages);
    const content = await generateAINewsletter(mappedCategories, userId, includeImages);
    console.log("Generated content:", content);
    res.json(content);
  } catch (error) {
    console.error("Error generating AI content:", error);
    res.status(500).json({
      error: "Failed to generate AI content",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Route for getting full content of selected articles
router.post("/selected", async (req, res) => {
  try {
    const { categories, selectedUrls } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: "Please provide at least one category",
      });
    }

    if (
      !selectedUrls ||
      !Array.isArray(selectedUrls) ||
      selectedUrls.length === 0
    ) {
      return res.status(400).json({
        error: "Please provide at least one selected article URL",
      });
    }

    const mappedCategories = categories.map(
      (cat) => categoryMapping[cat.toLowerCase()],
    );
    const articles = await getNewsContent(mappedCategories);
    const selectedArticles = await getSelectedArticles(articles, selectedUrls);

    res.json(selectedArticles);
  } catch (error) {
    console.error("Error fetching selected articles:", error);
    res.status(500).json({
      error: "Failed to fetch selected articles",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;