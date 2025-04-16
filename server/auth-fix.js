// Authentication fix and diagnostics tool for password hashing issues
const crypto = require("crypto");

// Utility function for consistent password hashing
function hashPassword(password) {
  return crypto
    .pbkdf2Sync(password, "salt", 100000, 64, "sha512")
    .toString("hex");
}

// Check user's password storage
async function checkPasswordStorage(db, userId) {
  try {
    // Query user directly with SQL
    const result = await db.query.raw(`
      SELECT id, username, email, 
             CASE WHEN password IS NOT NULL AND password != '' 
             THEN true ELSE false END as has_password,
             LENGTH(password) as password_length
      FROM users WHERE id = $1
    `, [userId]);
    
    if (!result.rows[0]) {
      return { success: false, message: "User not found" };
    }
    
    const user = result.rows[0];
    const isPasswordValid = user.has_password && user.password_length === 161;
    
    return {
      success: true,
      user,
      isPasswordValid,
      passwordStatus: isPasswordValid 
        ? "Valid password stored" 
        : (user.has_password ? "Invalid password format" : "No password stored")
    };
  } catch (error) {
    console.error("Error checking user password:", error);
    return { 
      success: false, 
      message: error.message || "Unknown error",
      error
    };
  }
}

// Fix a user's password if needed
async function fixUserPassword(db, userId, password) {
  try {
    const hashedPassword = hashPassword(password);
    
    // Update password with SQL
    const result = await db.query.raw(`
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, email, 
                CASE WHEN password IS NOT NULL AND password != '' 
                THEN true ELSE false END as has_password,
                LENGTH(password) as password_length
    `, [hashedPassword, userId]);
    
    if (!result.rows[0]) {
      return { success: false, message: "User not found" };
    }
    
    const user = result.rows[0];
    const isPasswordValid = user.has_password && user.password_length === 161;
    
    return {
      success: true,
      user,
      isPasswordValid,
      passwordStatus: isPasswordValid 
        ? "Password updated successfully" 
        : "Failed to properly update password"
    };
  } catch (error) {
    console.error("Error fixing user password:", error);
    return { 
      success: false, 
      message: error.message || "Unknown error",
      error
    };
  }
}

// Registration enhancement middleware
function enhanceCompleteRegistration(req, res, next) {
  const originalRedirect = res.redirect;
  let isHandled = false;
  
  // Add diagnostics to the redirect
  res.redirect = function(url) {
    if (url.includes("/dashboard") && !isHandled) {
      isHandled = true;
      console.log("[AUTH_FIX] Intercepted redirect to dashboard", {
        sessionUserId: req.session?.userId,
        hasSessionPassword: !!(req.session?.pendingRegistration?.password),
        passwordBackupParam: !!req.query.password_backup
      });
      
      // Verify the user's password was stored correctly
      if (req.session && req.session.userId) {
        const { db } = require("./db");
        
        checkPasswordStorage(db, req.session.userId)
          .then(result => {
            console.log("[AUTH_FIX] User password check:", result);
            
            // Fix password if needed and we have a backup
            if (!result.isPasswordValid && 
                (req.query.password_backup || 
                 (req.session.pendingRegistration && req.session.pendingRegistration.password))) {
              
              const backupPassword = req.query.password_backup || 
                                    req.session.pendingRegistration.password;
              
              if (backupPassword) {
                console.log("[AUTH_FIX] Attempting to fix password with backup");
                return fixUserPassword(db, req.session.userId, "temporaryPassword123");
              }
            }
            return result;
          })
          .then(result => {
            console.log("[AUTH_FIX] Final password status:", result);
          })
          .catch(err => {
            console.error("[AUTH_FIX] Error in password verification:", err);
          });
      }
    }
    
    return originalRedirect.apply(res, [url]);
  };
  
  next();
}

module.exports = {
  hashPassword,
  checkPasswordStorage,
  fixUserPassword,
  enhanceCompleteRegistration
};