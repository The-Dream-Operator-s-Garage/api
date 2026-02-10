const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../utils/jwt');

/**
 * Authentication Routes
 * Base path: /api/identity
 */

// Public routes (no authentication required)

/**
 * POST /api/identity/register
 * Register a new user using a secret
 * Body: { secret?: string, id: string, password: string }
 */
router.post('/register', authController.register);

/**
 * POST /api/identity/login
 * Login with username and password
 * Body: { username: string, password: string }
 */
router.post('/login', authController.login);

/**
 * POST /api/identity/secret
 * Login with secret (alternative authentication)
 * Body: { secret: string }
 */
router.post('/secret', authController.loginWithSecret);

/**
 * GET /api/identity/status
 * Get system initialization status
 */
router.get('/status', authController.getStatus);

/**
 * POST /api/identity/init
 * Initialize the system (create pioneer)
 */
router.post('/init', authController.initializeSystem);

/**
 * POST /api/identity/check-secret
 * Check if a secret is valid and unused
 * Body: { secret: string }
 */
router.post('/check-secret', authController.checkSecret);

// Protected routes (authentication required)

/**
 * GET /api/identity/verify
 * Verify JWT token
 * Headers: Authorization: Bearer <token>
 */
router.get('/verify', authMiddleware, authController.verifyToken);

/**
 * GET /api/identity/user/:id
 * Get user/entity information by entity ID
 * Headers: Authorization: Bearer <token>
 */
router.get('/user/:id', authMiddleware, authController.getUserInfo);

/**
 * GET /api/identity/ancestor/:id
 * Get ancestor entity information for a given entity ID
 * Headers: Authorization: Bearer <token>
 */
router.get('/ancestor/:id', authMiddleware, authController.getAncestorInfo);

module.exports = router;

