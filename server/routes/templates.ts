import express from "express";
import { db } from "../db/index";
import { templates } from "../db/schema";
import { eq, like, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../auth"; // Import requireAuth from main auth file

const templatesRouter = express.Router();

// Schema for saving a template
const saveTemplateSchema = z.object({
  id: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : val),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  html: z.string().min(1, "Template content is required"),
  preview: z.string().optional(),
  blocks: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  structure: z
    .object({
      blocks: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          content: z.string(),
        }),
      ),
      version: z.string(),
    })
    .optional(),
  isUpdate: z.boolean().optional().default(false),
});

// Get all templates for the authenticated user
templatesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("Fetching templates for user ID:", userId);

    try {
      // Use parameterized query to prevent SQL injection and improve caching
      const result = await db.execute(
        `SELECT * FROM templates WHERE user_id = ${userId} ORDER BY created_at DESC`
      );

      console.log("Found templates:", result.rows.length);

      // Format the templates efficiently
      const formattedTemplates = result.rows.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description || "",
        html: template.html,
        preview: template.preview || "/templates/blank-template.png",
        blocks: Array.isArray(template.blocks) ? template.blocks : [],
        structure: template.structure || { blocks: [], version: "1.0" },
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      }));

      // Send response directly without wrapping
      return res.json(formattedTemplates);
    } catch (err) {
      console.error("Database query error:", err);
      throw err; // Let the outer catch handle the error
    }
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
templatesRouter.post("/save", requireAuth, async (req, res) => {
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
      isUpdate,
    } = validationResult.data;

    // If updating an existing template
    if (isUpdate && id) {
      console.log("Processing template update:", { id, userId });

      try {
        // Start transaction
        await db.execute('BEGIN');

        // First verify template exists and lock it
        const existingTemplate = await db.execute(
          `SELECT * FROM templates WHERE id = '${id}' FOR UPDATE`
        );

        if (existingTemplate.rowCount === 0) {
          await db.execute('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: "Template not found"
          });
        }

        if (existingTemplate.rows[0].user_id !== userId) {
          await db.execute('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: "You don't have permission to update this template"
          });
        }

        // Perform the update within the transaction
        const escapedName = name.replace(/'/g, "''");
        const escapedDesc = (description || "").replace(/'/g, "''");
        const escapedHtml = html.replace(/'/g, "''");
        const escapedPreview = (preview || "/templates/blank-template.png").replace(/'/g, "''");
        const escapedBlocks = JSON.stringify(blocks || []).replace(/'/g, "''");
        const escapedStructure = JSON.stringify(structure || { blocks: [], version: "1.0" }).replace(/'/g, "''");
        
        const updateResult = await db.execute(`
          UPDATE templates 
          SET name = '${escapedName}',
              description = '${escapedDesc}',
              html = '${escapedHtml}',
              preview = '${escapedPreview}',
              blocks = '${escapedBlocks}'::jsonb,
              structure = '${escapedStructure}'::jsonb,
              updated_at = NOW()
          WHERE id = '${id}' AND user_id = ${userId}
          RETURNING id
        `);

        if (updateResult.rowCount === 0) {
          throw new Error('Template update failed');
        }

        // Commit the transaction
        await db.execute('COMMIT');

      console.log("Template updated successfully:", id);

        // Return updated template data
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
            structure: structure || { blocks: [], version: "1.0" },
            updatedAt: new Date()
          }
        });
      } catch (error: any) {
        await db.execute('ROLLBACK');
        console.error("Template update error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to update template",
          error: error.message || "Unknown error occurred"
        });
      }
    }
    // Creating a new template
    else {
      const templateId = parseInt((Date.now().toString().slice(-7)));
      console.log("Creating new template with ID:", templateId);

      // Insert new template with all the necessary fields using string interpolation
      const escapedName = name.replace(/'/g, "''");
      const escapedDesc = (description || "").replace(/'/g, "''");
      const escapedHtml = html.replace(/'/g, "''");
      const escapedPreview = (preview || "/templates/blank-template.png").replace(/'/g, "''");
      const escapedBlocks = JSON.stringify(blocks || []).replace(/'/g, "''");
      const escapedStructure = JSON.stringify(structure || { blocks: [], version: "1.0" }).replace(/'/g, "''");
      
      const newTemplate = await db.execute(`
        INSERT INTO templates 
        (id, user_id, name, description, html, preview, blocks, structure, created_at, updated_at) 
        VALUES (
          '${templateId}', 
          ${userId}, 
          '${escapedName}', 
          '${escapedDesc}', 
          '${escapedHtml}', 
          '${escapedPreview}', 
          '${escapedBlocks}'::jsonb, 
          '${escapedStructure}'::jsonb, 
          NOW(), 
          NOW()
        )
        RETURNING id
      `);

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
          structure: structure || { blocks: [], version: "1.0" },
        },
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
templatesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = req.params.id;
    
    // Fetch template with user check using string interpolation since db.execute doesn't support parameterized queries
    const result = await db.execute(
      `SELECT * FROM templates WHERE id = ${templateId} AND user_id = ${userId} LIMIT 1`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Template not found or unauthorized",
      });
    }

    const template = result.rows[0];
    
    // Format template for frontend
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
    console.error("Failed to fetch template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message,
    });
  }
});

// Delete a template
templatesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template ID",
      });
    }

    console.log(`Attempting to delete template ${templateId} for user ${userId}`);

    try {
      console.log("Delete parameters:", { templateId, userId });

      // Use direct integer values in the query for debugging
      const verifyQuery = `
        SELECT EXISTS(
          SELECT 1 FROM templates 
          WHERE id = ${templateId} AND user_id = ${userId}
        )`;
      
      const verifyResult = await db.execute(verifyQuery);
      console.log("Verify result:", verifyResult?.rows?.[0]);

      if (!verifyResult?.rows?.[0]?.exists) {
        return res.status(404).json({
          success: false,
          message: "Template not found or unauthorized"
        });
      }

      // If template exists, proceed with deletion
      const deleteQuery = `
        DELETE FROM templates 
        WHERE id = ${templateId} 
        AND user_id = ${userId} 
        RETURNING id`;
        
      const deleteResult = await db.execute(deleteQuery);
    console.log("Template", templateId, "deleted successfully");

      if (deleteResult.rowCount === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete template"
        });
      }

      return res.json({
        success: true,
        message: "Template deleted successfully",
        deletedId: templateId
      });
    } catch (err: any) {
      console.error("Delete error details:", {
        error: err,
        message: err.message || "Unknown error",
        code: err.code || "NO_CODE",
        position: err.position || "UNKNOWN",
        templateId,
        userId
      });
      
      return res.status(500).json({
        success: false,
        message: "Failed to delete template",
        error: err.message || "Unknown error",
        details: {
          code: err.code || "NO_CODE",
          position: err.position || "UNKNOWN"
        }
      });
    }
  } catch (error: any) {
    console.error("Failed to delete template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete template",
      error: error.message,
    });
  }
});

// Search templates by name
templatesRouter.get("/search/:query", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const searchQuery = req.params.query;
    const userTemplates = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.userId, userId),
          like(templates.name, `%${searchQuery}%`),
        ),
      );

    return res.json({
      success: true,
      templates: userTemplates,
    });
  } catch (error: any) {
    console.error("Failed to search templates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search templates",
      error: error.message,
    });
  }
});

export default templatesRouter;