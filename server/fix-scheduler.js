import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix the scheduler.ts file
const schedulerFilePath = path.join(__dirname, 'lib/scheduler.ts');
let content = fs.readFileSync(schedulerFilePath, 'utf8');

// Add the startScheduler function if it doesn't exist
if (!content.includes('export function startScheduler')) {
  const startSchedulerCode = `
// Start the newsletter scheduler
export function startScheduler() {
  console.log("[Scheduler] Starting newsletter scheduler");
  
  // Process scheduled newsletters immediately on startup
  processScheduledNewsletters();
  
  // Then process scheduled newsletters every minute
  setInterval(() => {
    processScheduledNewsletters();
  }, 60000);
}
`;

  // Add the function to the end of the file
  content += startSchedulerCode;
  fs.writeFileSync(schedulerFilePath, content, 'utf8');
  console.log('✅ Added startScheduler function to scheduler.ts');
} else {
  console.log('✅ startScheduler function already exists in scheduler.ts');
}

console.log('✅ Scheduler fix completed!');
