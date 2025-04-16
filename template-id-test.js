/**
 * Simple Template ID Handling Test
 * 
 * This script manually tests the template ID handling functionality.
 * It bypasses the authentication by directly making API calls against the server.
 */

// Configure these values based on your database
const TEMPLATE_ID = 1; // ID of an existing template
const USER_ID = 1; // ID of the template owner

// Mock db and template functions
const db = {
  execute: async (query, params) => {
    console.log('QUERY:', query);
    console.log('PARAMS:', params);
    
    // Mock the database responses
    if (query.includes('SELECT') && query.includes('WHERE id =')) {
      console.log('Mocking template query result');
      
      // The template ID could be a number or a string with format "template-123"
      let templateId = params[0];
      let userId = params[1];
      
      console.log(`Looking for template with ID ${templateId} for user ${userId}`);
      
      // If the template ID is a string with our format, extract the numeric part
      if (typeof templateId === 'string' && templateId.startsWith('template-')) {
        const parts = templateId.split('-');
        if (parts.length >= 2) {
          const numericPart = parts[1];
          console.log(`Found string template ID: ${templateId}, extracted: ${numericPart}`);
          
          // If numeric ID matches our test ID, it's a match
          if (numericPart === String(TEMPLATE_ID) && userId === USER_ID) {
            return {
              rowCount: 1,
              rows: [{
                id: TEMPLATE_ID,
                name: 'Test Template',
                description: 'Test Description',
                html: '<div>Test HTML</div>',
                preview: '/test.png',
                blocks: [],
                structure: { blocks: [], version: '1.0' },
                user_id: USER_ID,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]
            };
          }
        }
      }
      
      // If the template ID is the exact match for our test ID
      if (templateId === TEMPLATE_ID && userId === USER_ID) {
        return {
          rowCount: 1,
          rows: [{
            id: TEMPLATE_ID,
            name: 'Test Template',
            description: 'Test Description',
            html: '<div>Test HTML</div>',
            preview: '/test.png',
            blocks: [],
            structure: { blocks: [], version: '1.0' },
            user_id: USER_ID,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        };
      }
      
      // No match
      return { rowCount: 0, rows: [] };
    }
    
    // For all other queries, return success
    return { rowCount: 1, rows: [{ id: TEMPLATE_ID }] };
  }
};

// Formatter function from server/template-save-patch.ts
function formatTemplateForClient(template) {
  return {
    id: template.id,
    name: template.name,
    description: template.description || "",
    html: template.html,
    preview: template.preview || "/templates/blank-template.png",
    blocks: template.blocks || [],
    structure: template.structure || { blocks: [], version: "1.0" },
    createdAt: template.created_at,
    updatedAt: template.updated_at
  };
}

// Test function for template fetching
async function testGetTemplate(templateId, userId) {
  try {
    console.log("\n=== TESTING TEMPLATE FETCH ===");
    console.log("🔍 Fetching template:", templateId, "for user:", userId);
    
    let finalTemplateId = templateId;
    
    // Handle string ID format template-123
    if (typeof templateId === 'string' && templateId.startsWith('template-')) {
      console.log(`🔍 Processing string template ID: ${templateId}`);
      
      // First try with the exact string ID
      const checkResult = await db.execute(
        `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [templateId, userId]
      );
      
      // If no record found, try to extract and use the numeric part
      if (checkResult.rowCount === 0) {
        try {
          const parts = templateId.split('-');
          if (parts.length >= 2) {
            const numericPart = parts[1];
            if (/^\d+$/.test(numericPart)) {
              const numericId = parseInt(numericPart, 10);
              console.log(`🔄 Trying with extracted numeric ID: ${numericId}`);
              
              const numericCheckResult = await db.execute(
                `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [numericId, userId]
              );
              
              if (numericCheckResult.rowCount > 0) {
                console.log(`✅ Found template using numeric ID: ${numericId}`);
                return {
                  success: true,
                  template: formatTemplateForClient(numericCheckResult.rows[0])
                };
              }
            }
          }
        } catch (err) {
          console.log(`❌ Error processing ID: ${err}`);
          // Continue with the original ID if there was an error
        }
      } else {
        // If we found it with the original string ID, return it directly
        return {
          success: true,
          template: formatTemplateForClient(checkResult.rows[0])
        };
      }
    }

    // Standard query with the original or fallback ID
    const result = await db.execute(
      `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [finalTemplateId, userId]
    );

    if (result.rowCount === 0) {
      console.error("❌ Template not found or unauthorized access:", templateId);
      return {
        success: false,
        message: "Template not found or you don't have permission to access it"
      };
    }

    const template = result.rows[0];

    // Format template for the client
    const formattedTemplate = formatTemplateForClient(template);

    return {
      success: true,
      template: formattedTemplate
    };
  } catch (error) {
    console.error("❌ Error fetching template:", error);
    return {
      success: false,
      message: "Failed to fetch template",
      error: error.message
    };
  }
}

// Test function for template deletion
async function testDeleteTemplate(templateId, userId) {
  try {
    console.log("\n=== TESTING TEMPLATE DELETION ===");
    console.log("🗑️ Deleting template:", templateId, "for user:", userId);
    
    let finalTemplateId = templateId;
    
    // Handle string ID format template-123
    if (typeof templateId === 'string' && templateId.startsWith('template-')) {
      console.log(`🔍 Processing string template ID for deletion: ${templateId}`);
      
      // First try with the exact string ID
      const checkResult = await db.execute(
        `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [templateId, userId]
      );
      
      // If no record found, try to extract and use the numeric part
      if (checkResult.rowCount === 0) {
        try {
          const parts = templateId.split('-');
          if (parts.length >= 2) {
            const numericPart = parts[1];
            if (/^\d+$/.test(numericPart)) {
              const numericId = parseInt(numericPart, 10);
              console.log(`🔄 Trying deletion with extracted numeric ID: ${numericId}`);
              
              const numericCheckResult = await db.execute(
                `SELECT * FROM templates WHERE id = $1 AND user_id = $2 LIMIT 1`,
                [numericId, userId]
              );
              
              if (numericCheckResult.rowCount > 0) {
                console.log(`✅ Found template for deletion using numeric ID: ${numericId}`);
                finalTemplateId = numericId;
              }
            }
          }
        } catch (err) {
          console.log(`❌ Error processing ID for deletion: ${err}`);
          // Continue with the original ID if there was an error
        }
      }
    }

    // Check if template exists and belongs to user
    const template = await db.execute(
      `SELECT * FROM templates WHERE id = $1 LIMIT 1`,
      [finalTemplateId]
    );

    if (template.rowCount === 0) {
      console.error("❌ Template not found:", templateId);
      return {
        success: false,
        message: "Template not found"
      };
    }

    if (template.rows[0].user_id !== userId) {
      console.error("🔒 Permission denied: template belongs to another user");
      return {
        success: false,
        message: "You don't have permission to delete this template"
      };
    }

    // Delete template
    await db.execute(
      `DELETE FROM templates WHERE id = $1`,
      [finalTemplateId]
    );

    console.log("✅ Template deleted successfully");

    return {
      success: true,
      message: "Template deleted successfully"
    };
  } catch (error) {
    console.error("❌ Error deleting template:", error);
    return {
      success: false,
      message: "Failed to delete template",
      error: error.message
    };
  }
}

// Run tests
async function runTests() {
  // Test 1: Fetch template with numeric ID
  console.log('\n==== TEST 1: NUMERIC ID FETCH ====');
  const numericResult = await testGetTemplate(TEMPLATE_ID, USER_ID);
  console.log('RESULT:', JSON.stringify(numericResult, null, 2));
  
  // Test 2: Fetch template with string ID
  console.log('\n==== TEST 2: STRING ID FETCH ====');
  const stringResult = await testGetTemplate(`template-${TEMPLATE_ID}`, USER_ID);
  console.log('RESULT:', JSON.stringify(stringResult, null, 2));
  
  // Test 3: Fetch template with invalid string ID
  console.log('\n==== TEST 3: INVALID STRING ID FETCH ====');
  const invalidResult = await testGetTemplate(`template-999`, USER_ID);
  console.log('RESULT:', JSON.stringify(invalidResult, null, 2));
  
  // Test 4: Delete template with string ID
  console.log('\n==== TEST 4: STRING ID DELETE ====');
  const deleteResult = await testDeleteTemplate(`template-${TEMPLATE_ID}`, USER_ID);
  console.log('RESULT:', JSON.stringify(deleteResult, null, 2));
  
  console.log('\n==== TESTS COMPLETED ====');
}

// Execute tests
runTests();