const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Secret Model
 * Stores secrets with polymorphic ownership for entity creation.
 * 
 * PathChain Integration:
 * - The `path` field stores the PathChain secret tag (e.g., "secrets/{hash}")
 * - owner_id references the entity that created/owns this secret
 * - used_at tracks when the secret was used to create a new entity
 * 
 * Secret Flow:
 * 1. Pioneer's secret is created automatically with makePioneer()
 * 2. Secrets are used via makeEntity(secretHash) to create new entities
 * 3. Once used, the secret's used_at timestamp is set
 */
const Secret = sequelize.define('Secret', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  path: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'PathChain secret tag (e.g., secrets/{hash} or {author}/secrets/{hash})'
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the entity that owns this secret'
  },
  owner_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // Entity type
    references: {
      model: 'owner_type',
      key: 'id'
    }
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when secret was used to create entity'
  }
}, {
  tableName: 'secret',
  timestamps: true
});

/**
 * Check if secret has been used
 */
Secret.prototype.isUsed = function() {
  return this.used_at !== null;
};

/**
 * Mark secret as used
 */
Secret.prototype.markAsUsed = async function() {
  this.used_at = new Date();
  await this.save();
  return this;
};

/**
 * Find secret by PathChain path
 */
Secret.findByPath = async function(path) {
  return await this.findOne({ where: { path } });
};

/**
 * Find unused secrets owned by entity
 */
Secret.findUnusedByOwner = async function(ownerId) {
  return await this.findAll({
    where: {
      owner_id: ownerId,
      used_at: null
    }
  });
};

module.exports = Secret;

