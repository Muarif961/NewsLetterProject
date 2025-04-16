/**
 * Template Utilities
 * Functions for working with templates in the client
 */

// Function to save a template
export async function saveTemplate(templateData, isUpdate = false) {
  console.log("Saving template:", templateData);
  
  try {
    // Ensure required fields are present
    if (!templateData.name || !templateData.html) {
      throw new Error("Template name and HTML content are required");
    }

    // Ensure blocks is an array
    if (!Array.isArray(templateData.blocks) || templateData.blocks.length === 0) {
      console.warn("Template missing blocks or empty blocks array, creating from HTML");
      // Parse HTML to create blocks if missing
      const parser = new DOMParser();
      const doc = parser.parseFromString(templateData.html, "text/html");
      
      const blocks = Array.from(doc.body.children).map((node, index) => ({
        id: `block-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
        type: determineNodeType(node),
        content: node.outerHTML,
      }));
      
      templateData.blocks = blocks;
      
      // Create structure if not provided
      if (!templateData.structure) {
        templateData.structure = {
          blocks,
          version: "1.0"
        };
      }
    }
    
    // Prepare request body
    const requestBody = {
      ...templateData,
      isUpdate
    };
    
    // Make API request
    const response = await fetch("/api/templates/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Template save failed:", response.status, errorData);
      throw new Error(errorData.message || "Failed to save template");
    }
    
    const result = await response.json();
    console.log("Template saved successfully:", result);
    
    return result;
  } catch (error) {
    console.error("Error in saveTemplate:", error);
    throw error;
  }
}

// Function to get all templates
export async function getAllTemplates() {
  try {
    const response = await fetch("/api/templates");
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching templates:", response.status, errorData);
      throw new Error(errorData.message || "Failed to fetch templates");
    }
    
    const result = await response.json();
    return result.templates || [];
  } catch (error) {
    console.error("Error in getAllTemplates:", error);
    throw error;
  }
}

// Function to get a single template by ID
export async function getTemplateById(templateId) {
  try {
    const response = await fetch(`/api/templates/${templateId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error fetching template:", response.status, errorData);
      throw new Error(errorData.message || "Failed to fetch template");
    }
    
    const result = await response.json();
    return result.template;
  } catch (error) {
    console.error("Error in getTemplateById:", error);
    throw error;
  }
}

// Function to delete a template
export async function deleteTemplate(templateId) {
  try {
    const response = await fetch(`/api/templates/${templateId}`, {
      method: "DELETE"
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error deleting template:", response.status, errorData);
      throw new Error(errorData.message || "Failed to delete template");
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error in deleteTemplate:", error);
    throw error;
  }
}

// Helper function to determine a node's type
function determineNodeType(node) {
  if (!node) return "text";
  
  const tagName = node.tagName?.toLowerCase();
  if (!tagName) return "text";
  
  if (tagName.match(/^h[1-6]$/)) return tagName;
  if (tagName === "ul") return "bullet-list";
  if (tagName === "ol") return "number-list";
  if (tagName === "img" || node.querySelector("img")) return "image";
  if (node.classList?.contains("icons-container")) return "icon";
  if (node.classList?.contains("button-block")) return "button";
  return "text";
}
