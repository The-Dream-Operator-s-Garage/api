const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ActionType Model
 * Lookup table defining valid action types for the logging system.
 * Examples: 'create', 'read', 'update', 'delete', 'login', 'logout', 'register', 'view'
 */
const ActionType = sequelize.define('ActionType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Type of action (e.g., create, read, update, delete, login, logout, register, view)'
  }
}, {
  tableName: 'action_type',
  timestamps: true,
  updatedAt: false // action_type only has created_at
});

// Action type IDs constants (to be set after initial data insert)
ActionType.CREATE = 1;
ActionType.READ = 2;
ActionType.UPDATE = 3;
ActionType.DELETE = 4;
ActionType.LOGIN = 5;
ActionType.LOGOUT = 6;
ActionType.REGISTER = 7;
ActionType.VIEW = 8;

module.exports = ActionType;
