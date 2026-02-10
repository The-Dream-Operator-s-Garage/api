const ownerTypeService = require('../services/ownerTypeService');

/**
 * Get all owner types
 */
const getAllOwnerTypes = async (req, res) => {
  try {
    const ownerTypes = await ownerTypeService.getAllOwnerTypes();
    res.json({
      success: true,
      data: ownerTypes,
      count: ownerTypes.length
    });
  } catch (error) {
    console.error('Error in getAllOwnerTypes controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get owner type by ID
 */
const getOwnerTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerType = await ownerTypeService.getOwnerTypeById(id);
    
    if (!ownerType) {
      return res.status(404).json({
        success: false,
        message: 'Owner type not found'
      });
    }
    
    res.json({
      success: true,
      data: ownerType
    });
  } catch (error) {
    console.error('Error in getOwnerTypeById controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Create a new owner type (requires authentication)
 */
const createOwnerType = async (req, res) => {
  try {
    const { type_name } = req.body;

    // Validate input
    if (!type_name || typeof type_name !== 'string' || type_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'type_name is required and must be a non-empty string'
      });
    }

    // Validate length (max 50 characters based on schema)
    if (type_name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'type_name must be 50 characters or less'
      });
    }

    const ownerType = await ownerTypeService.createOwnerType(type_name.trim());

    res.status(201).json({
      success: true,
      message: 'Owner type created successfully',
      data: {
        id: ownerType.id,
        type_name: ownerType.type_name,
        created_at: ownerType.created_at
      }
    });
  } catch (error) {
    console.error('Error in createOwnerType controller:', error);
    
    // Handle duplicate error
    if (error.code === 'DUPLICATE' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Owner type already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllOwnerTypes,
  getOwnerTypeById,
  createOwnerType
};
