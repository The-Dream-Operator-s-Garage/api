const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Login Model
 * Stores authentication credentials for entities.
 * 
 * PathChain Integration:
 * - Links PathChain entities to authentication credentials
 * - entity_id references the database entity (which has PathChain path)
 * - secret field can store PathChain secret hash for registration tracking
 */
const Login = sequelize.define('Login', {
  id: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    comment: 'Login identifier (username/email)'
  },
  entity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'entity',
      key: 'id'
    }
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Hashed password (SHA256)'
  },
  secret: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'PathChain secret hash used for registration'
  }
}, {
  tableName: 'login',
  timestamps: true
});

/**
 * Find login by username
 */
Login.findByUsername = async function(username) {
  return await this.findByPk(username);
};

/**
 * Check if username exists
 */
Login.usernameExists = async function(username) {
  const count = await this.count({ where: { id: username } });
  return count > 0;
};

module.exports = Login;

