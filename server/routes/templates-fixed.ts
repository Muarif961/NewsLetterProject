/**
 * Enhanced Templates API Routes
 * Provides improved validation, security, and error handling for template operations
 */

import express, { Request, Response } from "express";
import { db } from "../db/index";
import { z } from "zod";
import { requireAuth } from "../auth"; 

const templatesRouter = express.Router();

// Schema for saving a template
const saveTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  html: z.string().min(1, "Template content is required"),
  preview: z.string().optional(),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      content: z.string()
    })
  ).optional(),
  structure: z.object({
    blocks: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        content: z.string()
      })
    ),
    version: z.string()
  }).optional(),
  isUpdate: z.boolean().optional().default(false),
});

// Get all templates for the authenticated user
templatesRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("Fetching templates for user ID:", userId);

    // Use a raw SQL query for better control and debugging
    const result = await db.execute(
      `SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    console.log("Found templates:", result.rows.length);

    // Format the templates to match the expected structure in the frontend
    const formattedTemplates = result.rows.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || "",
      html: template.html,
      preview: template.preview || "/templates/blank-template.png",
      blocks: template.blocks || [],
      structure: template.structure || { blocks: [], version: "1.0" },
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }));

    return res.json({
      success: true,
      templates: formattedTemplates,
    });
  } catch (error: any) {
    console.error("Failed to fetch templates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message,
    });
  }
});

// Save a template
templatesRouter.post("/save", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("Template save request received from user:", userId);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const validationResult = saveTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return res.status(400).json({
        success: false,
        message: "Invalid template data",
        errors: validationResult.error.format(),
      });
    }

    const { 
      id, 
      name, 
      description, 
      html, 
      preview, 
      blocks, 
      structure,
      isUpdate 
    } = validationResult.data;

    // If updating an existing template
    if (isUpdate && id) {
      console.log("Updating existing template:", id);
      
      // Check if template exists and belongs to user
      const existingTemplate = await db.execute(
        `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (existingTemplate.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      if (existingTemplate.rows[0].user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to update this template",
        });
      }

      // Update the template with all the necessary fields
      await db.execute(
        `UPDATE templates 
         SET name = $1, 
             description = $2, 
             html = $3, 
             preview = $4, 
             blocks = $5,
             structure = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [
          name,
          description || "",
          html,
          preview || "/templates/blank-template.png",
          JSON.stringify(blocks || []),
          JSON.stringify(structure || { blocks: [], version: "1.0" }),
          id
        ]
      );

      console.log("Template updated successfully");

      return res.json({
        success: true,
        message: "Template updated successfully",
        templateId: id,
        template: {
          id,
          name,
          description: description || "",
          html,
          preview: preview || "/templates/blank-template.png",
          blocks: blocks || [],
          structure: structure || { blocks: [], version: "1.0" }
        }
      });
    } 
    // Creating a new template
    else {
      const templateId = id || parseInt(Date.now().toString());
      console.log("Creating new template with ID:", templateId);

      // Insert new template with all the necessary fields
      const newTemplate = await db.execute(
        `INSERT INTO templates 
         (id, user_id, name, description, html, preview, blocks, structure, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id`,
        [
          templateId,
          userId,
          name,
          description || "",
          html,
          preview || "/templates/blank-template.png",
          JSON.stringify(blocks || []),
          JSON.stringify(structure || { blocks: [], version: "1.0" })
        ]
      );

      console.log("Template created successfully:", newTemplate.rows[0]);

      return res.json({
        success: true,
        message: "Template saved successfully",
        templateId: templateId,
        template: {
          id: templateId,
          name,
          description: description || "",
          html,
          preview: preview || "/templates/blank-template.png",
          blocks: blocks || [],
          structure: structure || { blocks: [], version: "1.0" }
        }
      });
    }
  } catch (error: any) {
    console.error("Failed to save template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save template",
      error: error.message,
    });
  }
});

// Get a specific template by ID
templatesRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = req.params.id;
    
    // Fetch template with parameterized query
    const result = await db.execute(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [templateId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    const template = result.rows[0];

    // If this is a system template (null user_id) or belongs to the user, allow access
    if (template.user_id !== null && template.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this template",
      });
    }

    // Format template for the client
    const formattedTemplate = {
      id: template.id,
      name: template.name,
      description: template.description || "",
      html: template.html,
      preview: template.preview || "/templates/blank-template.png",
      blocks: template.blocks || [],
      structure: template.structure || { blocks: [], version: "1.0" },
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };

    return res.json({
      success: true,
      template: formattedTemplate,
    });
  } catch (error: any) {
    console.error("Failed to fetch template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message,
    });
  }
});

// Delete a template
templatesRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = req.params.id;
    
    // Verify template belongs to user with parameterized query
    const template = await db.execute(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [templateId]
    );

    if (template.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    if (template.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this template",
      });
    }

    // Delete with parameterized query
    await db.execute(
      `DELETE FROM templates WHERE id = $1`,
      [templateId]
    );

    return res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete template",
      error: error.message,
    });
  }
});

export default templatesRouter;