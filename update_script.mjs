import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join('client', 'src', 'components', 'rich-text-editor.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Replace the edit button code in all three locations
let replacementCount = 0;
const modifiedContent = fileContent.replace(
  /const blockId = this\.closest\('\[data-block-id\]'\)\?\.getAttribute\('data-block-id'\);\s*\n\s*const img = this\.closest\('\.image-block'\)\.querySelector\('img'\);\s*\n\s*if\(blockId && img\) {\s*\n\s*const scale = img\.style\.width \? parseInt\(img\.style\.width\) : 100;\s*\n\s*const editEvent = new CustomEvent\('editImage', {\s*\n\s*detail: {\s*\n\s*url: img\.src,\s*\n\s*scale: scale,\s*\n\s*blockId: blockId\s*\n\s*}\s*\n\s*}\);/g,
  `const blockId = this.closest('[data-block-id]')?.getAttribute('data-block-id');
              const blockType = this.closest('[data-block-id]')?.getAttribute('data-block-type');
              const img = this.closest('.image-block').querySelector('img');
              if(blockId && img) {
                const scale = img.style.width ? parseInt(img.style.width) : 100;
                const column = this.closest('.column');
                const isWithinColumn = !!column;
                
                const content = isWithinColumn && blockType === 'columns' ? 
                  this.closest('[data-block-id]').outerHTML : '';
                  
                const editEvent = new CustomEvent('editImage', { 
                  detail: { 
                    url: img.src, 
                    scale: scale, 
                    blockId: blockId,
                    isWithinColumn: isWithinColumn,
                    originalContent: content
                  }
                });`
);

// Count replacements
replacementCount = (fileContent.match(/const blockId = this\.closest\('\[data-block-id\]'\)\?\.getAttribute\('data-block-id'\);\s*\n\s*const img = this\.closest\('\.image-block'\)\.querySelector\('img'\);/g) || []).length;

fs.writeFileSync(filePath, modifiedContent);
console.log(`File updated successfully. Made ${replacementCount} replacements.`);
