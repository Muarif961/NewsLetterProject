/**
 * Template Save Functionality Patch
 * This script improves template saving functionality to correctly associate templates with users.
 */

const { db } = require('./db');

// Function to save a template with proper user association
async function saveTemplate(templateData, userId) {
  try {
    console.log("💾 Saving template for user:", userId);
    console.log("Template data being saved:", JSON.stringify({
      id: templateData.id,
      name: templateData.name,
      description: templateData.description
    }));
    
    const { 
      id, 
      name, 
      description = "", 
      html, 
      preview = null, 
      blocks = templateData.blocks || [], 
      structure = templateData.structure || { blocks: [], version: "1.0" },
      isUpdate = false 
    } = templateData;
    
    // If blocks array is empty, generate a fallback block from HTML content
    if (!blocks.length && html) {
      console.log("⚠️ Received empty blocks array, generating a fallback block from HTML content");
      blocks = [{
        id: `block-${Date.now()}-fallback-${Math.random().toString(36).substring(2, 9)}`,
        type: "html",
        content: html
      }];
      
      // Also update structure
      structure.blocks = blocks;
    }
    
    // Still validate after potential fix
    if (!blocks.length) {
      console.error("❌ Template blocks cannot be empty");
      return {
        success: false,
        message: "Template blocks must not be empty"
      };
    }
    
    // Generate a template ID if one wasn't provided
    const templateId = id || `template-${Date.now()}`;
    
    // If updating an existing template
    if (isUpdate && id) {
      console.log("🔄 Updating existing template:", id);
      
      try {
        // Check if template exists and belongs to user
        const existingTemplate = await db.query(
          `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
          [id]
        );

        if (existingTemplate.rowCount === 0) {
          console.error("❌ Template not found:", id);
          return {
            success: false,
            message: "Template not found"
          };
        }

        if (existingTemplate.rows[0].user_id !== userId) {
          console.error("🔒 Permission denied: template belongs to another user");
          return {
            success: false,
            message: "You don't have permission to update this template"
          };
        }

        // Update the template
        await db.query(
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

        console.log("✅ Template updated successfully");

        return {
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
        };
      } catch (error) {
        console.error("Template update error:", error);
        return {
          success: false,
          message: "Failed to update template",
          error: error.message
        };
      }
    } 
    // Creating a new template
    else {
      console.log("➕ Creating new template with ID:", templateId);

      try {
        // Insert new template
        const result = await db.query(
          `INSERT INTO templates 
           (id, user_id, name, description, html, preview, blocks, structure, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id`,
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

        console.log("✅ Template created successfully");

        return {
          success: true,
          message: "Template saved successfully",
          templateId: templateId,
          template: {
            id: templateId,
            name,
            description,
            html,
            preview,
            blocks,
            structure
          }
        };
      } catch (error) {
        console.error("Failed to save template:", error);
        return {
          success: false,
          message: "Failed to save template",
          error: error.message
        };
      }
    }
  } catch (error) {
    console.error("❌ Error saving template:", error);
    return {
      success: false,
      message: "Failed to save template",
      error: error.message
    };
  }
}

// Function to get all templates for a user
async function getUserTemplates(userId) {
  try {
    console.log("📋 Fetching templates for user:", userId);
    
    // Fetch templates
    const result = await db.query(
      `SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    console.log(`📊 Found ${result.rowCount} templates`);
    
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

    return {
      success: true,
      templates
    };
  } catch (error) {
    console.error("❌ Error fetching templates:", error);
    return {
      success: false,
      message: "Failed to fetch templates",
      error: error.message
    };
  }
}

// Function to get a specific template
async function getTemplate(templateId, userId) {
  try {
    console.log("🔍 Fetching template:", templateId, "for user:", userId);
    
    // Fetch template
    const result = await db.query(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [templateId]
    );

    if (result.rowCount === 0) {
      console.error("❌ Template not found:", templateId);
      return {
        success: false,
        message: "Template not found"
      };
    }

    const template = result.rows[0];
    
    // Check if template belongs to user or is a system template (null user_id)
    if (template.user_id !== null && template.user_id !== userId) {
      console.error("🔒 Permission denied: template belongs to another user");
      return {
        success: false,
        message: "You don't have permission to access this template"
      };
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

    return {
      success: true,
      template: formattedTemplate
    };
  } catch (error) {
    console.error("❌ Error fetching template:", error);
    return {
      success: false,
      message: "Failed to fetch template",
      error: error.message
    };
  }
}

// Function to delete a template
async function deleteTemplate(templateId, userId) {
  try {
    console.log("🗑️ Deleting template:", templateId, "for user:", userId);
    
    // Check if template exists and belongs to user
    const template = await db.query(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [templateId]
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
    await db.query(
      `DELETE FROM templates WHERE id = $1`,
      [templateId]
    );

    console.log("✅ Template deleted successfully");

    return {
      success: true,
      message: "Template deleted successfully"
    };
  } catch (error) {
    console.error("❌ Error deleting template:", error);
    return {
      success: false,
      message: "Failed to delete template",
      error: error.message
    };
  }
}

// Apply the patch to Express routes
function applyTemplatePatch(app) {
  console.log("🔧 Applying template save patch");
  
  // Override the existing template save endpoint
  app.post("/api/templates/save", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
      
      console.log("Template save request received from user:", userId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      const result = await saveTemplate(req.body, userId);
      
      if (!result.success) {
        return res.status(result.error ? 500 : 400).json(result);
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Template save error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });
  
  // Override the existing templates fetch endpoint
  app.get("/api/templates", async (req, res) => {
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
    } catch (error) {
      console.error("Templates fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });
  
  // Override the existing template fetch endpoint
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
      
      const templateId = req.params.id;
      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: "Template ID is required"
        });
      }
      
      const result = await getTemplate(templateId, userId);
      
      if (!result.success) {
        return res.status(result.error ? 500 : 404).json(result);
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Template fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  });
  
  // Override the existing template delete endpoint
  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }
      
      const templateId = req.params.id;
      if (!templateId) {
        return res.status(400).json({
          success: false,
          message: "Template ID is required"
        });
      }
      
      const result = await deleteTemplate(templateId, userId);
      
      if (!result.success) {
        return res.status(result.error ? 500 : 404).json(result);
      }
      
      return res.json(result);
    } catch (error) {
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

module.exports = {
  saveTemplate,
  getUserTemplates,
  getTemplate,
  deleteTemplate,
  applyTemplatePatch
};
