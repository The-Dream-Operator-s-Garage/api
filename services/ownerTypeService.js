const { OwnerType } = require('../models');

/**
 * Service for OwnerType operations
 */
const getAllOwnerTypes = async () => {
  try {
    const ownerTypes = await OwnerType.findAll({
      order: [['id', 'ASC']],
      attributes: ['id', 'type_name', 'created_at']
    });
    return ownerTypes;
  } catch (error) {
    console.error('Error fetching owner types:', error);
    throw error;
  }
};

const getOwnerTypeById = async (id) => {
  try {
    const ownerType = await OwnerType.findByPk(id, {
      attributes: ['id', 'type_name', 'created_at']
    });
    return ownerType;
  } catch (error) {
    console.error('Error fetching owner type by id:', error);
    throw error;
  }
};

const createOwnerType = async (typeName) => {
  try {
    // Check if owner type already exists
    const existing = await OwnerType.findOne({
      where: { type_name: typeName }
    });

    if (existing) {
      const error = new Error('Owner type already exists');
      error.code = 'DUPLICATE';
      throw error;
    }

    // Create new owner type
    const ownerType = await OwnerType.create({
      type_name: typeName
    });

    return ownerType;
  } catch (error) {
    console.error('Error creating owner type:', error);
    throw error;
  }
};

module.exports = {
  getAllOwnerTypes,
  getOwnerTypeById,
  createOwnerType
};
