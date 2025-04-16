/**
 * Manual Template Patch Application
 * This script can be executed to apply the template save patch directly
 */

const { integrateTemplatePatch } = require('./apply-template-patch');
const express = require('express');

// Mock Express app for testing
const mockApp = express();

// Various HTTP methods for testing
const methods = ['get', 'post', 'put', 'delete'];
methods.forEach(method => {
  mockApp[method] = (path, handler) => {
    console.log(`Route registered: ${method.toUpperCase()} ${path}`);
    // Return self for chaining
    return mockApp;
  };
});

// Create a global reference to the routes
mockApp._routes = [];

// Apply the patch to test route registration
console.log("🧪 Testing patch with mock Express app:");
integrateTemplatePatch(mockApp);

console.log("\n🔄 To apply this patch to the live server, modify server/index.ts to require and use './apply-template-patch'");
console.log("Example: \n```\n// At the top of the file\nimport { integrateTemplatePatch } from './apply-template-patch';\n\n// After routes registration\nintegrateTemplatePatch(app);\n```");
