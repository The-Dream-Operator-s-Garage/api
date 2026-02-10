const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * OwnerType Model
 * Lookup table defining valid owner types for polymorphic relationships.
 * Pre-populated with: 'entity', 'organization', 'post', 'tevent'
 */
const OwnerType = sequelize.define('OwnerType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      isIn: [['entity', 'organization', 'post', 'tevent']]
    }
  }
}, {
  tableName: 'owner_type',
  timestamps: true,
  updatedAt: false // owner_type only has created_at
});

// Owner type IDs constants
OwnerType.ENTITY = 1;
OwnerType.ORGANIZATION = 2;
OwnerType.POST = 3;
OwnerType.TEVENT = 4;

module.exports = OwnerType;

