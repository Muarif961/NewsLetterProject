/**
 * Template Patch Integrator
 * This file applies the template patch to improve template saving functionality
 */

// Import the patch
const { applyTemplatePatch } = require('./template-save-patch');

// Export function to integrate the patch
function integrateTemplatePatch(app) {
  console.log("🚀 Integrating template saving patch...");
  
  if (!app) {
    console.error("❌ Cannot apply template patch: app object is undefined");
    return;
  }
  
  try {
    // Apply the template patch
    applyTemplatePatch(app);
    console.log("✅ Template patch integrated successfully!");
  } catch (error) {
    console.error("❌ Error applying template patch:", error);
  }
}

module.exports = { integrateTemplatePatch };
