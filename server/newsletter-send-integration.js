// Integration script for newsletter send endpoint

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the routes.ts file
const routesFilePath = path.join(__dirname, 'routes.ts');
let routesContent = fs.readFileSync(routesFilePath, 'utf8');

// Read the patch content
const patchFilePath = path.join(__dirname, 'routes-newsletter-send-patch.ts');
const patchContent = fs.readFileSync(patchFilePath, 'utf8');

// Regular expression to match the app.post("/api/newsletters/send", ...) endpoint
const sendEndpointRegex = /app\.post\("\/api\/newsletters\/send"[^;]*\);/s;

// Replace the existing endpoint with our patched version
const updatedRoutesContent = routesContent.replace(sendEndpointRegex, patchContent.trim());

// Write the updated content back to routes.ts
fs.writeFileSync(routesFilePath, updatedRoutesContent, 'utf8');

console.log('✅ Newsletter send endpoint patch applied successfully!');
