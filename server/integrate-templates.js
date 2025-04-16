/**
 * Templates API Integration
 * This file integrates the improved templates router with the main Express app
 */

const templatesRouter = require('./routes/templates-new');

/**
 * Function to integrate the templates router with the Express app
 * @param {import('express').Express} app - The Express app instance
 */
function integrateTemplatesRouter(app) {
  console.log("🔄 Integrating improved templates router");
  
  if (!app) {
    console.error("❌ Cannot integrate templates router: app object is undefined");
    return;
  }
  
  try {
    // Mount the templates router at /api/templates
    app.use('/api/templates', templatesRouter);
    console.log("✅ Templates router integrated successfully!");
  } catch (error) {
    console.error("❌ Error integrating templates router:", error);
  }
}

module.exports = { integrateTemplatesRouter };
