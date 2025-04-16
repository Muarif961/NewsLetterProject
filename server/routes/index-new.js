const express = require("express");
const templatesRouter = require("./templates-new");

function registerRoutes(app) {
  // Get the existing templates route
  const existingRoutes = app._router.stack
    .filter(r => r.route && r.route.path && r.route.path.startsWith('/api/templates'))
    .map(r => r.route.path);
  
  console.log("Existing template routes:", existingRoutes);
  
  // Remove any existing templates routes if they exist
  if (existingRoutes.length > 0) {
    console.log("Removing existing template routes");
    app._router.stack = app._router.stack.filter(r => {
      if (r.route && r.route.path && r.route.path.startsWith('/api/templates')) {
        return false;
      }
      return true;
    });
  }
  
  // Register the new templates router
  console.log("Registering new templates router");
  app.use("/api/templates", templatesRouter);
  
  console.log("Template routes registered");
}

module.exports = { registerRoutes };
