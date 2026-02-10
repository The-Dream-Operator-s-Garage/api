const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pathos-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h'; // 1 hour session

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - Data to encode in token
 * @param {string} payload.entityId - Database entity ID
 * @param {string} payload.username - Login username
 * @param {string} payload.path - PathChain entity path
 * @returns {string} - JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(
    {
      entityId: payload.entityId,
      username: payload.username,
      path: payload.path,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

/**
 * Decode JWT token without verification (for inspection)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} - Decoded payload or null
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Express middleware to verify JWT token
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 40103,
        message: 'No authorization header provided'
      }
    });
  }

  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 40104,
        message: 'Invalid or expired token'
      }
    });
  }

  req.user = decoded;
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  authMiddleware,
  JWT_SECRET,
  JWT_EXPIRY
};

