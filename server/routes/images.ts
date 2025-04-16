import { Router, Request, Response } from "express";
import axios from "axios";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import { generateAIImage, createImageVariation, editImage } from "../lib/ai";

const router = Router();

// Set up storage for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { 
    fileSize: 4 * 1024 * 1024 // 4MB limit
  } 
});

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), "uploads");
fs.existsSync(uploadsDir) || fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * Generate an image with AI with credit validation and deduction
 * 
 * POST /api/images/generate
 * Body: { prompt: string, size?: string, quality?: string, style?: string }
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    // Extract request data
    const { prompt, size, quality, style } = req.body;
    const userId = req.user?.id;
    
    // Validate inputs
    if (!prompt) {
      return res.status(400).json({
        error: "Missing prompt",
        details: "A prompt is required to generate an image"
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to use this feature"
      });
    }

    console.log("Image generation request:");
    console.log("- User ID:", userId);
    console.log("- Prompt:", prompt);
    console.log("- Size:", size || "default");
    console.log("- Quality:", quality || "default");
    console.log("- Style:", style || "default");

    // Generate the image with credit integration
    const result = await generateAIImage(userId, prompt, {
      size: size as "1024x1024" | "1792x1024" | "1024x1792",
      quality: quality as "standard" | "hd",
      style: style as "natural" | "vivid"
    });

    // Save the generated image locally
    const imageUrl = await saveRemoteImage(result.imageUrl);

    // Send response
    res.json({
      url: imageUrl,
      revisedPrompt: result.revisedPrompt,
      creditCost: result.creditCost,
      success: true
    });
  } catch (error: any) {
    console.error("Error generating image:", error);

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
        details: "Unable to generate more images at this time",
      });
    }

    if (error.code === "content_policy_violation") {
      return res.status(400).json({
        error: "Content policy violation",
        details: "The prompt violates content policies. Please revise your prompt."
      });
    }

    // Generic error response
    res.status(500).json({
      error: "Failed to generate image",
      details: error.message || "Unknown error",
    });
  }
});

/**
 * Create variations of an image with credit validation and deduction
 * 
 * POST /api/images/variation
 * Body: Multipart form with 'image' file
 */
router.post("/variation", upload.single("image"), async (req: Request, res: Response) => {
  try {
    // Extract request data
    const image = req.file;
    const userId = req.user?.id;
    const n = parseInt(req.body.n || "1");
    
    // Validate inputs
    if (!image) {
      return res.status(400).json({
        error: "Missing image",
        details: "An image file is required to create variations"
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to use this feature"
      });
    }

    console.log("Image variation request:");
    console.log("- User ID:", userId);
    console.log("- Image size:", image.size);
    console.log("- Number of variations:", n);

    // Create image variations with credit integration
    const result = await createImageVariation(userId, image.buffer, {
      n: Math.min(n, 4), // Limit to 4 variations max
      size: "1024x1024"
    });

    // Save all generated images locally
    const imageUrls = await Promise.all(
      result.images.map(url => saveRemoteImage(url))
    );

    // Send response
    res.json({
      urls: imageUrls,
      creditCost: result.creditCost,
      success: true
    });
  } catch (error: any) {
    console.error("Error creating image variation:", error);

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
        details: "Unable to create more image variations at this time",
      });
    }

    if (error.code === "invalid_image_format") {
      return res.status(400).json({
        error: "Invalid image format",
        details: "The image must be a PNG or JPEG file and less than 4MB in size."
      });
    }

    // Generic error response
    res.status(500).json({
      error: "Failed to create image variation",
      details: error.message || "Unknown error",
    });
  }
});

/**
 * Edit an image with AI with credit validation and deduction
 * 
 * POST /api/images/edit
 * Body: Multipart form with 'image' and 'mask' files, and 'prompt' text
 */
router.post("/edit", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "mask", maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    // Extract request data
    const files = req.files as { 
      [fieldname: string]: Express.Multer.File[] 
    };
    const { prompt } = req.body;
    const userId = req.user?.id;
    const imageFile = files.image?.[0];
    const maskFile = files.mask?.[0];
    
    // Validate inputs
    if (!imageFile || !maskFile) {
      return res.status(400).json({
        error: "Missing files",
        details: "Both image and mask files are required"
      });
    }

    if (!prompt) {
      return res.status(400).json({
        error: "Missing prompt",
        details: "A prompt is required to edit the image"
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        details: "User must be logged in to use this feature"
      });
    }

    console.log("Image edit request:");
    console.log("- User ID:", userId);
    console.log("- Prompt:", prompt);
    console.log("- Image size:", imageFile.size);
    console.log("- Mask size:", maskFile.size);

    // Edit the image with credit integration
    const result = await editImage(
      userId,
      imageFile.buffer, 
      maskFile.buffer, 
      prompt
    );

    // Save all generated images locally
    const imageUrls = await Promise.all(
      result.images.map(url => saveRemoteImage(url))
    );

    // Send response
    res.json({
      urls: imageUrls,
      creditCost: result.creditCost,
      success: true
    });
  } catch (error: any) {
    console.error("Error editing image:", error);

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
        details: "Unable to edit more images at this time",
      });
    }

    if (error.code === "invalid_image_format") {
      return res.status(400).json({
        error: "Invalid image format",
        details: "The image and mask must be PNG files and less than 4MB in size."
      });
    }

    // Generic error response
    res.status(500).json({
      error: "Failed to edit image",
      details: error.message || "Unknown error",
    });
  }
});

/**
 * Helper function to save a remote image to the local filesystem
 * @param remoteUrl URL of the image to save
 * @returns Local URL path to access the saved image
 */
async function saveRemoteImage(remoteUrl: string): Promise<string> {
  try {
    // Generate a unique filename
    const filename = `generated-${crypto.randomBytes(8).toString("hex")}.png`;
    const filepath = join(process.cwd(), "uploads", filename);

    console.log("Fetching image from URL:", remoteUrl);

    // Fetch and validate the image
    const imageResponse = await axios.get(remoteUrl, {
      responseType: "arraybuffer",
      validateStatus: (status) => status === 200,
      headers: {
        Accept: "image/png,image/*",
      },
    });

    // Validate content type
    const contentType = imageResponse.headers["content-type"];
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    // Save the image locally
    await writeFile(filepath, imageResponse.data);

    console.log("Image saved successfully:", filepath);

    // Generate the complete URL for the image
    const imageUrl = `/uploads/${filename}`;
    console.log("Image URL:", imageUrl);

    // Return the local URL
    return imageUrl;
  } catch (error) {
    console.error("Error saving remote image:", error);
    throw error;
  }
}

export default router;