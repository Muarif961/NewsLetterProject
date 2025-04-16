/**
 * Template Save Functionality Patch
 * This script improves template saving functionality to correctly associate templates with users.
 */

import { db } from './db/index';
import { Request, Response } from 'express';
import { Express } from 'express';

// Helper function to format template data for client consumption
function formatTemplateForClient(template: any) {
  return {
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
}

// Function to save a template with proper user association
async function saveTemplate(templateData: any, userId: number) {
  try {
    console.log("💾 Saving template for user:", userId);
    console.log("Template data received:", {
      id: templateData.id,
      name: templateData.name,
      isUpdate: templateData.isUpdate,
      type: typeof templateData.id
    });

    const { 
      id, 
      name, 
      description = "", 
      html, 
      preview = null,
      blocks = [],
      structure = { blocks: [], version: "1.0" },
      isUpdate = false 
    } = templateData;

    // Log detailed information about the update operation
    console.log(`🔍 TEMPLATE OPERATION:
      - isUpdate flag: ${isUpdate}
      - Template ID present: ${Boolean(id)}
      - Template ID: ${id}
      - Template ID type: ${typeof id}
      - Operation: ${isUpdate && id ? 'UPDATE' : 'CREATE'}
    `);

    // If updating an existing template
    if (isUpdate && id) {
      // Check if we need to handle a custom string ID (e.g., template-1234567890)
      let templateIdParam = id;
      
      // First check if the template exists in the database as is
      const checkResult = await db.execute(
        `SELECT id FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [templateIdParam, userId]
      );
      
      // If we didn't find it with the exact ID, and it's a string ID with our prefix pattern,
      // we need to try different strategies
      if (checkResult.rowCount === 0 && typeof id === 'string' && id.startsWith('template-')) {
        console.log(`🔍 Template with exact ID "${id}" not found, trying to extract numeric part`);
        
        // Try to find by just the numeric part if the ID is in the format template-123
        try {
          const parts = id.split('-');
          if (parts.length >= 2) {
            const numericPart = parts[1];
            if (/^\d+$/.test(numericPart)) {
              const numericId = parseInt(numericPart, 10);
              console.log(`🔄 Extracted numeric ID: ${numericId}, checking if exists`);
              
              const numericCheckResult = await db.execute(
                `SELECT id FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [numericId, userId]
              );
              
              if (numericCheckResult.rowCount > 0) {
                console.log(`✅ Found matching template using numeric ID: ${numericId}`);
                templateIdParam = numericId;
              }
            }
          }
        } catch (err) {
          console.log(`❌ Error processing ID: ${err}`);
          // Continue with the original ID if there was an error
        }
      }
      
      console.log(`🔄 Final ID parameter for update: ${templateIdParam}`);

      // Check if template exists and belongs to user
      const result = await db.execute(
        `UPDATE templates 
         SET name = $1, description = $2, html = $3, preview = $4, blocks = $5, structure = $6, updated_at = NOW()
         WHERE id = $7 AND user_id = $8
         RETURNING id, name, description, html, preview, blocks, structure, created_at, updated_at`,
        [name, description, html, preview, JSON.stringify(blocks), JSON.stringify(structure), templateIdParam, userId]
      );

      if (result.rowCount === 0) {
        console.log(`❌ No template updated - template not found: ${templateIdParam}`);
        return {
          success: false,
          message: "Template not found or unauthorized"
        };
      }

      // Format the template with client-friendly structure
      const updatedTemplate = formatTemplateForClient(result.rows[0]);

      console.log(`✅ Template updated successfully: ${updatedTemplate.id}`);
      return {
        success: true,
        message: "Template updated successfully",
        templateId: updatedTemplate.id,
        template: updatedTemplate
      };
    } 
    // Creating a new template
    else {
      // For new templates, we need to handle the string ID differently
      // If the client is sending a string ID like "template-1234567890", we can either:
      // 1. Use it directly if your DB supports string/UUID primary keys
      // 2. Extract a numeric part if needed
      // 3. Ignore it and let the DB generate a new ID (preferred for auto-increment)

      console.log(`🆕 Creating new template: "${name}"`);
      
      const result = await db.execute(
        `INSERT INTO templates (user_id, name, description, html, preview, blocks, structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, description, html, preview, blocks, structure, created_at, updated_at`,
        [userId, name, description, html, preview, JSON.stringify(blocks), JSON.stringify(structure)]
      );

      // Format the template with client-friendly structure
      const newTemplate = formatTemplateForClient(result.rows[0]);

      console.log(`✅ Template created successfully: ${newTemplate.id}`);
      return {
        success: true,
        message: "Template created successfully",
        templateId: newTemplate.id,
        template: newTemplate
      };
    }
  } catch (error: any) {
    console.error("❌ Error saving template:", error);
    return {
      success: false,
      message: "Failed to save template",
      error: error.message
    };
  }
}

// Function to get all templates for a user
async function getUserTemplates(userId: number) {
  try {
    console.log("📋 Fetching templates for user:", userId);

    // Fetch templates
    const result = await db.execute(
      `SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    console.log(`📊 Found ${result.rowCount} templates`);

    // Format templates for the client
    const templates = result.rows.map(template => formatTemplateForClient(template));

    return {
      success: true,
      templates
    };
  } catch (error: any) {
    console.error("❌ Error fetching templates:", error);
    return {
      success: false,
      message: "Failed to fetch templates",
      error: error.message
    };
  }
}

// Function to get a specific template
async function getTemplate(templateId: string | number, userId: number) {
  try {
    console.log("🔍 Fetching template:", templateId, "for user:", userId);
    
    let finalTemplateId = templateId;
    
    // Handle string ID format template-123
    if (typeof templateId === 'string' && templateId.startsWith('template-')) {
      console.log(`🔍 Processing string template ID: ${templateId}`);
      
      // First try with the exact string ID
      const checkResult = await db.execute(
        `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [templateId, userId]
      );
      
      // If no record found, try to extract and use the numeric part
      if (checkResult.rowCount === 0) {
        try {
          const parts = templateId.split('-');
          if (parts.length >= 2) {
            const numericPart = parts[1];
            if (/^\d+$/.test(numericPart)) {
              const numericId = parseInt(numericPart, 10);
              console.log(`🔄 Trying with extracted numeric ID: ${numericId}`);
              
              const numericCheckResult = await db.execute(
                `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [numericId, userId]
              );
              
              if (numericCheckResult.rowCount > 0) {
                console.log(`✅ Found template using numeric ID: ${numericId}`);
                return {
                  success: true,
                  template: formatTemplateForClient(numericCheckResult.rows[0])
                };
              }
            }
          }
        } catch (err) {
          console.log(`❌ Error processing ID: ${err}`);
          // Continue with the original ID if there was an error
        }
      } else {
        // If we found it with the original string ID, return it directly
        return {
          success: true,
          template: formatTemplateForClient(checkResult.rows[0])
        };
      }
    }

    // Standard query with the original or fallback ID
    const result = await db.execute(
      `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [finalTemplateId, userId]
    );

    if (result.rowCount === 0) {
      console.error("❌ Template not found or unauthorized access:", templateId);
      return {
        success: false,
        message: "Template not found or you don't have permission to access it"
      };
    }

    const template = result.rows[0];

    // Format template for the client
    const formattedTemplate = formatTemplateForClient(template);

    return {
      success: true,
      template: formattedTemplate
    };
  } catch (error: any) {
    console.error("❌ Error fetching template:", error);
    return {
      success: false,
      message: "Failed to fetch template",
      error: error.message
    };
  }
}

// Function to delete a template
async function deleteTemplate(templateId: string | number, userId: number) {
  try {
    console.log("🗑️ Deleting template:", templateId, "for user:", userId);
    
    let finalTemplateId = templateId;
    
    // Handle string ID format template-123
    if (typeof templateId === 'string' && templateId.startsWith('template-')) {
      console.log(`🔍 Processing string template ID for deletion: ${templateId}`);
      
      // First try with the exact string ID
      const checkResult = await db.execute(
        `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [templateId, userId]
      );
      
      // If no record found, try to extract and use the numeric part
      if (checkResult.rowCount === 0) {
        try {
          const parts = templateId.split('-');
          if (parts.length >= 2) {
            const numericPart = parts[1];
            if (/^\d+$/.test(numericPart)) {
              const numericId = parseInt(numericPart, 10);
              console.log(`🔄 Trying deletion with extracted numeric ID: ${numericId}`);
              
              const numericCheckResult = await db.execute(
                `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [numericId, userId]
              );
              
              if (numericCheckResult.rowCount > 0) {
                console.log(`✅ Found template for deletion using numeric ID: ${numericId}`);
                finalTemplateId = numericId;
              }
            }
          }
        } catch (err) {
          console.log(`❌ Error processing ID for deletion: ${err}`);
          // Continue with the original ID if there was an error
        }
      }
    }

    // Check if template exists and belongs to user
    const template = await db.execute(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [finalTemplateId]
    );

    if (template.rowCount === 0) {
      console.error("❌ Template not found:", templateId);
      return {
        success: false,
        message: "Template not found"
      };
    }

    if (template.rows[0].user_id !== userId) {
      console.error("🔒 Permission denied: template belongs to another user");
      return {
        success: false,
        message: "You don't have permission to delete this template"
      };
    }

    // Delete template
    await db.execute(
      `DELETE FROM templates WHERE id = $1`,
      [finalTemplateId]
    );

    console.log("✅ Template deleted successfully");

    return {
      success: true,
      message: "Template deleted successfully"
    };
  } catch (error: any) {
    console.error("❌ Error deleting template:", error);
    return {
      success: false,
      message: "Failed to delete template",
      error: error.message
    };
  }
}

// Apply the patch to Express routes
export function applyTemplatePatch(app: Express) {
  console.log("🔧 Applying template save patch");


  app.post("/api/templates/save", async (req: Request, res: Response) => {
    try {
      console.log("🔍 TEMPLATE SAVE REQUEST:", {
        id: req.body.id,
        name: req.body.name,
        isUpdate: req.body.isUpdate,
        requestBody: JSON.stringify(req.body)
      });
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const result = await saveTemplate(req.body, userId);
      console.log("✅ TEMPLATE SAVE RESULT:", result);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error: any) {
      console.error("Template save error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });

  // Override the existing templates fetch endpoint
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const result = await getUserTemplates(userId);

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Templates fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });

  // Override the existing template fetch endpoint
  app.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      // Get the template ID directly from the params
      // It could be a string ID like "template-123456" or a numeric ID
      const templateId = req.params.id;
      
      console.log(`🔍 Looking up template with ID: ${templateId}`);

      const result = await getTemplate(templateId, userId);

      if (!result.success) {
        return res.status(result.error ? 500 : 404).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Template fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });

  // Override the existing template delete endpoint
  app.delete("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      // Get the template ID directly from the params
      // It could be a string ID like "template-123456" or a numeric ID
      const templateId = req.params.id;
      
      console.log(`🗑️ Deleting template with ID: ${templateId}`);

      const result = await deleteTemplate(templateId, userId);

      if (!result.success) {
        return res.status(result.error ? 500 : 404).json(result);
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Template delete error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });


  console.log("✅ Template patch applied successfully");
}