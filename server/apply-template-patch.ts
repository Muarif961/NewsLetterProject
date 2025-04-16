/**
 * Template Patch Integrator
 * This file applies the template patch to improve template saving functionality
 */

import { Express } from 'express';
import { applyTemplatePatch } from './template-save-patch';

// Function to integrate the template patch
export function integrateTemplatePatch(app: Express) {
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
