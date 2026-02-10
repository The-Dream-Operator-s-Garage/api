const authService = require('../services/authService');

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

/**
 * POST /api/identity/register
 * Register a new user using a secret
 */
const register = async (req, res) => {
  try {
    const { secret, id, password } = req.body;

    const result = await authService.register({
      secret,
      id,
      password
    });

    if (!result.success) {
      const statusCode = result.error.code < 50000 ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: result.token,
      entity: result.entity
    });
  } catch (error) {
    console.error('Register controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * POST /api/identity/login
 * Login with username and password
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await authService.login({
      username,
      password
    });

    if (!result.success) {
      const statusCode = result.error.code < 50000 ? 401 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      entity: result.entity
    });
  } catch (error) {
    console.error('Login controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * POST /api/identity/secret
 * Login with secret (alternative authentication)
 */
const loginWithSecret = async (req, res) => {
  try {
    const { secret } = req.body;

    const result = await authService.loginWithSecret({ secret });

    if (!result.success) {
      const statusCode = result.error.code < 50000 ? 401 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Secret login successful',
      token: result.token,
      entity: result.entity
    });
  } catch (error) {
    console.error('Secret login controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * GET /api/identity/status
 * Get system status (initialization, pioneer, etc.)
 */
const getStatus = async (req, res) => {
  try {
    const status = await authService.getSystemStatus();

    return res.status(200).json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Status controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * POST /api/identity/init
 * Initialize the system (create pioneer) if not already initialized
 */
const initializeSystem = async (req, res) => {
  try {
    const result = await authService.initializeSystem();

    return res.status(200).json({
      success: true,
      message: result.isNew ? 'System initialized' : 'System already initialized',
      pioneer: {
        id: result.pioneer.id,
        path: result.pioneer.path
      },
      isNew: result.isNew
    });
  } catch (error) {
    console.error('Initialize controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50001,
        message: 'Failed to initialize system: ' + error.message
      }
    });
  }
};

/**
 * GET /api/identity/verify
 * Verify JWT token (requires auth middleware)
 * Also verifies that the user entity still exists in the database
 * This invalidates tokens after RESET command
 */
const verifyToken = async (req, res) => {
  try {
    // req.user is set by auth middleware
    // JWT payload contains: { entityId, username, path, iat, exp }
    console.log('Verify token: JWT payload received:', {
      entityId: req.user.entityId,
      id: req.user.id,
      username: req.user.username,
      path: req.user.path,
      hasEntityId: !!req.user.entityId,
      hasId: !!req.user.id,
      allKeys: Object.keys(req.user)
    });
    
    const entityId = req.user.entityId || req.user.id; // Support both formats for compatibility
    
    if (!entityId) {
      console.error('Verify token: No entityId in token payload', req.user);
      return res.status(401).json({
        success: false,
        error: {
          code: 40104,
          message: 'Invalid token format'
        }
      });
    }
    
    console.log('Verify token: Using entityId:', entityId);
    
    // Verify that the entity still exists in the database
    // This ensures tokens are invalidated after RESET
    const { Entity, Login } = require('../models');
    const entity = await Entity.findByPk(entityId);
    
    if (!entity) {
      console.log('Verify token: Entity not found in database', entityId);
      return res.status(401).json({
        success: false,
        error: {
          code: 40104,
          message: 'User entity no longer exists. Please register again.'
        }
      });
    }
    
    // Also verify login record exists
    const login = await Login.findOne({ where: { entity_id: entityId } });
    if (!login) {
      console.log('Verify token: Login record not found', entityId);
      return res.status(401).json({
        success: false,
        error: {
          code: 40104,
          message: 'Login record no longer exists. Please register again.'
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: entity.id,
        username: login.id,
        entity_id: entity.id
      }
    });
  } catch (error) {
    console.error('Verify token controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * POST /api/identity/check-secret
 * Check if a secret is valid and unused
 */
const checkSecret = async (req, res) => {
  try {
    const { secret } = req.body;

    const result = await authService.checkSecret(secret);

    if (!result.valid) {
      const statusCode = result.error.code < 50000 ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        valid: false,
        unused: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      valid: result.valid,
      unused: result.unused
    });
  } catch (error) {
    console.error('Check secret controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * GET /api/identity/user/:id
 * Get user/entity information by entity ID (requires authentication)
 */
const getUserInfo = async (req, res) => {
  try {
    const entityId = parseInt(req.params.id);

    const result = await authService.getUserInfo(entityId);

    if (!result.success) {
      const statusCode = result.error.code < 50000 ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get user info controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

/**
 * GET /api/identity/ancestor/:id
 * Get ancestor entity information for a given entity ID (requires authentication)
 */
const getAncestorInfo = async (req, res) => {
  try {
    const entityId = parseInt(req.params.id);
    console.log('>>> Ancestor retrieval:: controllers/authController.js - request', { entityId });

    const result = await authService.getAncestorInfo(entityId);
    console.log('>>> Ancestor retrieval:: controllers/authController.js - service result', { success: result.success });

    if (!result.success) {
      const statusCode = result.error.code < 50000 ? 400 : 500;
      console.log('>>> Ancestor retrieval:: controllers/authController.js - error response', { statusCode, error: result.error });
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.log('>>> Ancestor retrieval:: controllers/authController.js - exception', { message: error.message });
    console.error('Get ancestor info controller error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 50000,
        message: 'Internal server error'
      }
    });
  }
};

module.exports = {
  register,
  login,
  loginWithSecret,
  getStatus,
  initializeSystem,
  verifyToken,
  checkSecret,
  getUserInfo,
  getAncestorInfo
};

