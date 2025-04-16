/**
 * Templates API Routes
 * Handles template CRUD operations with improved validation and error handling
 */

import express, { Request, Response } from "express";
import { db } from "../db/index";
import { z } from "zod";

const router = express.Router();

// Schema for template data validation
const templateBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.string()
});

const templateStructureSchema = z.object({
  blocks: z.array(templateBlockSchema),
  version: z.string()
});

const saveTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional().default(""),
  html: z.string().min(1, "HTML content is required"),
  preview: z.string().optional().nullable(),
  blocks: z.array(templateBlockSchema).nonempty("Template must have at least one block"),
  structure: templateStructureSchema.optional(),
  isUpdate: z.boolean().optional().default(false)
});

/**
 * Save or update a template
 * POST /api/templates/save
 */
router.post("/save", async (req: Request, res: Response) => {
  try {
    // Get the user ID from request (assuming auth middleware adds user to req)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Validate request body
    const validationResult = saveTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error("❌ Template validation failed:", validationResult.error.format());
      return res.status(400).json({
        success: false,
        message: "Invalid template data",
        errors: validationResult.error.format()
      });
    }

    const { 
      id, 
      name, 
      description = "", 
      html, 
      preview = null,
      blocks,
      structure = { blocks, version: "1.0" },
      isUpdate = false 
    } = validationResult.data;

    // Ensure consistent template ID handling
    const templateId = id || `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log("Template operation:", isUpdate ? "UPDATE" : "CREATE", "Template ID:", templateId);

    console.log("📝 Processing template save request");
    console.log("Template has", blocks.length, "blocks");
    
    // Update existing template
    if (isUpdate && id) {
      console.log("🔄 Updating template:", id);
      
      // Check if template exists and belongs to user
      const existingTemplate = await db.execute(
        `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (existingTemplate.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Template not found"
        });
      }

      if (existingTemplate.rows[0].user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to update this template"
        });
      }

      // Update the template
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
          description,
          html,
          preview,
          JSON.stringify(blocks),
          JSON.stringify(structure),
          id
        ]
      );

      return res.json({
        success: true,
        message: "Template updated successfully",
        templateId: id,
        template: {
          id,
          name,
          description,
          html,
          preview,
          blocks,
          structure
        }
      });
    }
    // Create new template
    else {
      console.log("➕ Creating new template");
      
      // Only generate new ID if this is truly a new template
      const templateId = id || Date.now().toString();
      
      // Use upsert to either update existing or insert new
      await db.execute(
        `INSERT INTO templates 
         (id, user_id, name, description, html, preview, blocks, structure, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (id) 
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           html = EXCLUDED.html,
           preview = EXCLUDED.preview,
           blocks = EXCLUDED.blocks,
           structure = EXCLUDED.structure,
           updated_at = NOW()
         WHERE templates.user_id = $2`,
        [
          templateId,
          userId,
          name,
          description,
          html,
          preview,
          JSON.stringify(blocks),
          JSON.stringify(structure)
        ]
      );

      return res.json({
        success: true,
        message: "Template saved successfully",
        templateId,
        template: {
          id: templateId,
          name,
          description,
          html,
          preview,
          blocks,
          structure
        }
      });
    }
  } catch (error: any) {
    console.error("❌ Template save error:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving template",
      error: error.message
    });
  }
});

/**
 * Get all templates for the current user
 * GET /api/templates
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    console.log("📋 Fetching templates for user:", userId);
    
    // Fetch templates
    const result = await db.execute(
      `SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    console.log(`Found ${result.rowCount} templates`);
    
    // Format templates for the client
    const templates = result.rows.map(template => ({
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
      templates
    });
  } catch (error: any) {
    console.error("❌ Error fetching templates:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching templates",
      error: error.message
    });
  }
});

/**
 * Get a specific template by ID
 * GET /api/templates/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const templateId = req.params.id;
    console.log("🔍 Fetching template:", templateId);
    
    // Fetch template
    const result = await db.execute(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [templateId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const template = result.rows[0];
    
    // Check if template belongs to user or is a system template (null user_id)
    if (template.user_id !== null && template.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this template"
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
      template: formattedTemplate
    });
  } catch (error: any) {
    console.error("❌ Error fetching template:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching template",
      error: error.message
    });
  }
});

/**
 * Delete a template
 * DELETE /api/templates/:id
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const templateId = req.params.id;
    console.log("🗑️ Deleting template:", templateId);
    
    // Check if template exists and belongs to user
    const template = await db.execute(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [templateId]
    );

    if (template.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    if (template.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this template"
      });
    }

    // Delete template
    await db.execute(
      `DELETE FROM templates WHERE id = $1`,
      [templateId]
    );

    return res.json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error: any) {
    console.error("❌ Error deleting template:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting template",
      error: error.message
    });
  }
});

export default router;