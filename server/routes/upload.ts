import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { load } from "cheerio";
import { data } from "node_modules/cheerio/lib/esm/api/attributes";
import { configDotenv } from "dotenv";

configDotenv();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System prompts for different content types
const SYSTEM_PROMPTS = {
  PDF: `As an expert Newsletter creator, create an engaging newsletter from this PDF content. 
Format the content using proper HTML tags for different content types:
- Use <h1> for main titles
- Use <h2> for major sections
- Use <h3> for subsections
- Use <p> for regular paragraphs
- Use <ul> and <li> for bullet lists
- Use <ol> and <li> for numbered lists

Structure the content to be easily readable and engaging for email newsletters.
Use clear headers to organize the content hierarchically.
Use bullet points and numbered lists for listing items and key takeaways.
Keep paragraphs short and concise for better readability in email format.
Ensure all content is properly wrapped in appropriate HTML tags.`,

  YouTube: `Act as Newsletter Specialist and Generate a professional newsletter email from this YouTube transcript. 
Structure the content using the available block types (H1, H2, H3, Text, Bullet Point, Bullet, List, Images).
Format the content to be easily readable and engaging for email newsletters.
Use clear headers (H1, H2, H3) to organize the content hierarchically.
Use bullet points for listing items and key takeaways.
Keep paragraphs short and concise for better readability in email format.
Highlight key insights from the video in a well-structured format.`,
};

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`,
    );
  },
});

// PDF upload configuration
const pdfUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Image upload configuration
const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Handle PDF upload and summarization
router.post("/pdf", pdfUpload.single("file"), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;
    console.log("Processing uploaded file:", filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error("Upload failed - file not found");
    }

    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);

    // Dynamic import of pdf-parse
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;

    // Parse PDF content with timeout and size limits
    const data = await pdfParse(dataBuffer, {
      max: 50, // Maximum number of pages to parse
      timeout: 10000, // 10 second timeout
    });

    if (!data || !data.text || data.text.trim().length === 0) {
      throw new Error("No text content found in PDF");
    }

    // Truncate text if it's too long for the API
    const maxTextLength = 4000;
    const textToSummarize = data.text.slice(0, maxTextLength);

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.PDF,
        },
        {
          role: "user",
          content: textToSummarize,
        },
      ],
      max_tokens: 1000,
    });

    // Send response
    const formattedSummary = {
      executiveSummary: "Summary from PDF",
      topStories: [
        {
          title: path.basename(req.file.originalname, ".pdf"),
          description: completion.choices[0].message.content,
          source: "PDF Upload",
          publishedAt: new Date().toISOString(),
          category: "Documents",
        },
      ],
    };
    res.json({
      success: true,
      summary: formattedSummary,
      pageCount: data.numpages,
      textLength: data.text.length,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({
      error: "Failed to process PDF",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log("Cleaned up temporary file:", filePath);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
    }
  }
});

// Handle image upload endpoint
router.post("/image", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Generate URL for the uploaded file
    const imageUrl = `/uploads/${req.file.filename}`;

    // Return the image URL
    res.json({
      success: true,
      url: imageUrl,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      error: "Failed to upload image",
      message: error instanceof Error ? error.message : "The string did not match the expected pattern.",
    });
  }
});

// Handle image upload endpoint
router.post("/image", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Generate URL for the uploaded file
    const imageUrl = `/uploads/${req.file.filename}`;

    // Return the image URL
    res.json({
      success: true,
      url: imageUrl,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      error: "Failed to upload image",
      message: error instanceof Error ? error.message : "The string did not match the expected pattern.",
    });
  }
});

// Process YouTube URL
router.post("/youtube", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }

    try {
      // Extract video ID using a more comprehensive regex
      const videoId = url.match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      )?.[1];

      if (!videoId) {
        return res.status(400).json({
          error:
            "Could not extract video ID from URL. Please check the URL format.",
        });
      }

      // First verify video exists
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const videoCheckResponse = await fetch(videoUrl, { method: "HEAD" });

      if (!videoCheckResponse.ok) {
        return res.status(400).json({
          error:
            "Video not accessible. Please check if the video exists and is public.",
        });
      }

      // Double check with oembed
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
      );
      const oembedData = await oembedResponse.json().catch(() => null);

      if (!oembedData) {
        return res.status(400).json({
          error:
            "Could not verify video metadata. Please ensure the video is public.",
        });
      }

      const { YoutubeTranscript } = await import("youtube-transcript");
      let transcriptItems;
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: "en",
          country: "US",
        });
      } catch (error) {
        console.error("Transcript error:", error);
        // Try fetching available transcripts
        try {
          const langs = await YoutubeTranscript.listTranscripts(videoId);
          const transcript = await langs.fetch(
            langs.findTranscript(["en"]).languageCode,
          );
          transcriptItems = transcript;
        } catch (innerError) {
          console.error("Failed to fetch alternative transcript:", innerError);
          transcriptItems = [{ text: "Transcript unavailable" }];
        }
      }
      const transcript = transcriptItems.map((item) => item.text).join(" ");

      const response = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`,
      );
      const html = await response.text();
      const $ = load(html);
      const title = $("title").text();
      const description = $('meta[name="description"]').attr("content") || "";

      // Combine transcript with metadata for better context
      const fullContent = `Title: ${title}\n\nDescription: ${description}\n\nTranscript:\n${transcript}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPTS.YouTube,
          },
          {
            role: "user",
            content: fullContent,
          },
        ],
      });

      // Send response
      const VideoSummary = {
        executiveSummary: "Summary from Video",
        topStories: [
          {
            title,
            description: completion.choices[0].message.content,
            source: "Youtube Video",
            publishedAt: new Date().toISOString(),
            category: "Video",
          },
        ],
      };
      res.json({
        success: true,
        summary: VideoSummary,
      });
    } catch (error) {
      console.error("Error processing YouTube video:", error); //Added for better debugging
      res.status(500).json({
        error: "Failed to process YouTube video",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error processing YouTube URL:", error); //Added for better debugging
    res.status(500).json({
      error: "Failed to process YouTube URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Refine content based on user feedback
router.post("/refine", async (req, res) => {
  try {
    const { currentContent, userMessage, sourceType } = req.body;

    if (!currentContent || !userMessage) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Determine the appropriate model based on source type (matching the original summary generation)
    const model = sourceType === "YouTube" ? "gpt-4" : "gpt-3.5-turbo";

    // Generate refined content
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a newsletter content specialist. You help refine and improve content for email newsletters.
          Follow the user's instructions while maintaining the structure of a newsletter using appropriate formatting like 
          headers (H1, H2, H3), bullet points, and paragraphs. Keep the content organized and well-structured.`,
        },
        {
          role: "user",
          content: `Here is my current newsletter content:

          ${currentContent}

          Please make the following changes: ${userMessage}`,
        },
      ],
    });

    // Send response with refined content
    res.json({
      success: true,
      updatedContent: completion.choices[0].message.content,
      message: "Content updated successfully.",
    });
  } catch (error) {
    console.error("Error refining content:", error);
    res.status(500).json({
      error: "Failed to refine content",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;