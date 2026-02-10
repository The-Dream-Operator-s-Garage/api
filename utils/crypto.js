const crypto = require('crypto');

/**
 * Hash password using SHA256
 * @param {string} password - Plain text password
 * @returns {string} - SHA256 hashed password
 */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - SHA256 hash to compare against
 * @returns {boolean} - True if password matches hash
 */
const verifyPassword = (password, hash) => {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
};

/**
 * Generate random token
 * @param {number} length - Length of token in bytes (default 32)
 * @returns {string} - Random hex token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken
};

