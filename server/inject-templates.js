// Import the original server index file
const server = require('./index.ts');
const { registerRoutes } = require('./routes/index-new');

// Function to inject the new templates router
function injectTemplatesRouter() {
  try {
    console.log("Injecting new templates router...");
    
    // Wait for the server to be ready
    setTimeout(() => {
      if (server && server.app) {
        // Register the new templates router
        registerRoutes(server.app);
        console.log("Successfully injected new templates router!");
      } else {
        console.error("Server or app not available for injection");
      }
    }, 2000);
  } catch (error) {
    console.error("Error injecting templates router:", error);
  }
}

// Inject the templates router
injectTemplatesRouter();
