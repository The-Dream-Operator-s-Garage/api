const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Entity Model
 * Represents individual users or entities in the system.
 * Acts as a core identity that can own posts, tevents, and properties.
 * 
 * PathChain Integration:
 * - The `path` field stores the PathChain entity tag (e.g., "entities/{hash}")
 * - ancestor_id references the parent entity (from PathChain ancestor relationship)
 * - Pioneer entity has itself as ancestor (ancestor_id = null or self-reference)
 */
const Entity = sequelize.define('Entity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  path: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'PathChain entity tag (e.g., entities/{hash})'
  },
  ancestor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'entity',
      key: 'id'
    },
    comment: 'Foreign key to parent entity (from PathChain ancestor)'
  }
}, {
  tableName: 'entity',
  timestamps: true
});

/**
 * Check if this entity is the pioneer (root entity)
 * Pioneer has no ancestor or references itself
 */
Entity.prototype.isPioneer = function() {
  return this.ancestor_id === null || this.ancestor_id === this.id;
};

/**
 * Find the pioneer entity (first/root entity)
 */
Entity.findPioneer = async function() {
  return await this.findOne({
    where: {
      ancestor_id: null
    },
    order: [['id', 'ASC']]
  });
};

module.exports = Entity;

