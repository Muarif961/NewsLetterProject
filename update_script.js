const fs = require('fs');
const path = require('path');

const filePath = path.join('client', 'src', 'components', 'rich-text-editor.tsx');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Replace the edit button code in all three locations
const modifiedContent = fileContent.replace(
  /const blockId = this\.closest\('\[data-block-id\]'\)\?\.getAttribute\('data-block-id'\);\s*const img = this\.closest\('\.image-block'\)\.querySelector\('img'\);\s*if\(blockId && img\) {\s*const scale = img\.style\.width \? parseInt\(img\.style\.width\) : 100;\s*const editEvent = new CustomEvent\('editImage', {\s*detail: {\s*url: img\.src,\s*scale: scale,\s*blockId: blockId\s*}\s*}\);/g,
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

fs.writeFileSync(filePath, modifiedContent);
console.log('File updated successfully');
