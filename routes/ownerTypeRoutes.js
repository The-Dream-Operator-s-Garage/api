const express = require('express');
const router = express.Router();
const ownerTypeController = require('../controllers/ownerTypeController');
const { authMiddleware } = require('../utils/jwt');

// Public routes (no authentication required)

// GET /api/owner_types - Get all owner types
router.get('/owner_types', ownerTypeController.getAllOwnerTypes);

// GET /api/owner_types/:id - Get owner type by ID
router.get('/owner_types/:id', ownerTypeController.getOwnerTypeById);

// Protected routes (authentication required)

// POST /api/owner_types - Create a new owner type
// Headers: Authorization: Bearer <token>
// Body: { type_name: string }
router.post('/owner_types', authMiddleware, ownerTypeController.createOwnerType);

module.exports = router;
