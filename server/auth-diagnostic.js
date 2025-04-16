// Auth Diagnostic Tool
// This file provides utility functions for diagnosing and fixing authentication issues
// particularly focused on password storage problems.

const crypto = require('crypto');

// Standard password hashing function
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
}

// Run diagnostics on all users
async function runAllUserDiagnostics(db) {
  try {
    // Get overall password stats
    const passwordStats = await db.query.raw(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN password IS NULL THEN 1 ELSE 0 END) as missing_passwords,
        SUM(CASE WHEN password = '' THEN 1 ELSE 0 END) as empty_passwords,
        SUM(CASE WHEN LENGTH(password) = 161 THEN 1 ELSE 0 END) as valid_passwords,
        SUM(CASE WHEN LENGTH(password) != 161 AND password IS NOT NULL AND password != '' THEN 1 ELSE 0 END) as invalid_passwords
      FROM users
    `);
    
    // Get problematic users
    const problematicUsers = await db.query.raw(`
      SELECT 
        id, 
        username, 
        email, 
        LENGTH(password) as password_length,
        CASE 
          WHEN password IS NULL THEN 'missing'
          WHEN password = '' THEN 'empty'
          WHEN LENGTH(password) != 161 THEN 'invalid_length'
          ELSE 'valid'
        END as password_status
      FROM users
      WHERE password IS NULL 
         OR password = '' 
         OR LENGTH(password) != 161
      ORDER BY id
    `);
    
    return {
      stats: passwordStats.rows[0],
      problematicUsers: problematicUsers.rows
    };
  } catch (error) {
    console.error('Error in runAllUserDiagnostics:', error);
    throw error;
  }
}

// Run diagnostic on a specific user
async function checkUserPassword(db, userId) {
  try {
    const result = await db.query.raw(`
      SELECT 
        id, 
        username, 
        email, 
        LENGTH(password) as password_length,
        CASE 
          WHEN password IS NULL THEN 'missing'
          WHEN password = '' THEN 'empty'
          WHEN LENGTH(password) = 161 THEN 'valid'
          ELSE 'invalid_length'
        END as password_status
      FROM users
      WHERE id = $1
    `, [userId]);
    
    if (!result.rows.length) {
      return { error: 'User not found' };
    }
    
    return {
      user: result.rows[0],
      isValid: result.rows[0].password_status === 'valid'
    };
  } catch (error) {
    console.error('Error in checkUserPassword:', error);
    throw error;
  }
}

// Fix a user's password
async function fixUserPassword(db, userId, password) {
  try {
    const hashedPassword = hashPassword(password);
    
    const result = await db.query.raw(`
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, LENGTH(password) as password_length
    `, [hashedPassword, userId]);
    
    if (!result.rows.length) {
      return { error: 'User not found' };
    }
    
    return {
      user: result.rows[0],
      fixed: result.rows[0].password_length === 161
    };
  } catch (error) {
    console.error('Error in fixUserPassword:', error);
    throw error;
  }
}

// Express route handler for diagnostics
async function handleDiagnosticsRequest(req, res) {
  try {
    const { db } = require('./db');
    const diagnostics = await runAllUserDiagnostics(db);
    res.json({
      message: 'Authentication system diagnostics',
      ...diagnostics
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({
      message: 'Error running diagnostics',
      error: error.message
    });
  }
}

// Express route handler for checking a specific user
async function handleUserCheckRequest(req, res) {
  try {
    const { db } = require('./db');
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const result = await checkUserPassword(db, userId);
    
    if (result.error) {
      return res.status(404).json({ message: result.error });
    }
    
    res.json({
      message: 'User password check results',
      ...result
    });
  } catch (error) {
    console.error('User check error:', error);
    res.status(500).json({
      message: 'Error checking user',
      error: error.message
    });
  }
}

// Express route handler for fixing a user's password
async function handleFixPasswordRequest(req, res) {
  try {
    const { db } = require('./db');
    const userId = parseInt(req.params.userId);
    const { password } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    const result = await fixUserPassword(db, userId, password);
    
    if (result.error) {
      return res.status(404).json({ message: result.error });
    }
    
    res.json({
      message: 'User password updated successfully',
      ...result
    });
  } catch (error) {
    console.error('Password fix error:', error);
    res.status(500).json({
      message: 'Error fixing password',
      error: error.message
    });
  }
}

// Function to register the diagnostic routes to an Express app
function registerDiagnosticRoutes(app) {
  app.get('/api/auth/diagnostic', handleDiagnosticsRequest);
  app.get('/api/auth/diagnostic/:userId', handleUserCheckRequest);
  app.post('/api/auth/fix-password/:userId', handleFixPasswordRequest);
  
  console.log('Auth diagnostic routes registered');
}

module.exports = {
  hashPassword,
  runAllUserDiagnostics,
  checkUserPassword,
  fixUserPassword,
  registerDiagnosticRoutes
};