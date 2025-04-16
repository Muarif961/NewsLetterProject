// Auth diagnostic routes
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

// Utility function for password hashing that matches the one used throughout the app
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
}

// Get general auth diagnostics
router.get('/', async (req, res) => {
  try {
    const result = await db.query.raw('SELECT auth_diagnostics()');
    res.json({
      message: 'Authentication system diagnostics',
      diagnostics: result.rows[0].auth_diagnostics
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({
      message: 'Error running diagnostics',
      error: error.message
    });
  }
});

// Check a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
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
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'User password check',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User check error:', error);
    res.status(500).json({
      message: 'Error checking user',
      error: error.message
    });
  }
});

// Fix a specific user's password
router.post('/fix-password/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { password } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Hash the password
    const hashedPassword = hashPassword(password);
    
    // Update the user's password
    const result = await db.query.raw(`
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, LENGTH(password) as password_length
    `, [hashedPassword, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isValid = result.rows[0].password_length === 161;
    
    res.json({
      message: 'Password update ' + (isValid ? 'successful' : 'failed'),
      user: result.rows[0],
      isValid
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      message: 'Error updating password',
      error: error.message
    });
  }
});

module.exports = router;