// Integration script for scheduler

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the scheduler.ts file
const schedulerFilePath = path.join(__dirname, 'lib/scheduler.ts');
let schedulerContent = fs.readFileSync(schedulerFilePath, 'utf8');

// Read the patch content
const patchFilePath = path.join(__dirname, 'scheduler-patch.ts');
const patchContent = fs.readFileSync(patchFilePath, 'utf8');

// Extract the processScheduledNewslettersWithGroups function
const functionMatch = patchContent.match(/export async function processScheduledNewslettersWithGroups\(\) {[\s\S]*}/);
if (!functionMatch) {
  console.error('Failed to extract the processScheduledNewslettersWithGroups function from the patch file');
  process.exit(1);
}

const functionContent = functionMatch[0];

// Replace the existing processScheduledNewsletters function with our enhanced version
const updatedSchedulerContent = schedulerContent.replace(
  /export async function processScheduledNewsletters\(\) {[\s\S]*}/s,
  functionContent.replace('processScheduledNewslettersWithGroups', 'processScheduledNewsletters')
);

// Update imports if needed
const updatedImportsContent = updatedSchedulerContent.replace(
  /import {[^}]*} from "[^"]*\/db\/schema";/,
  `import { 
  newsletters, 
  subscribers, 
  subscriber_groups,
  subscriber_group_members,
  type Newsletter, 
  type Subscriber 
} from "../db/schema";`
);

// Update drizzle-orm import if needed
const finalContent = updatedImportsContent.replace(
  /import { [^}]*} from "drizzle-orm";/,
  `import { and, eq, lte, inArray } from "drizzle-orm";`
);

// Write the updated content back to scheduler.ts
fs.writeFileSync(schedulerFilePath, finalContent, 'utf8');

console.log('✅ Newsletter scheduler patch applied successfully!');
