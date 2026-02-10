const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * LogType Model
 * Lookup table defining valid log types for the logging system.
 * Examples: 'system', 'user_action', 'api_call', 'error', 'security', 'audit'
 */
const LogType = sequelize.define('LogType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Type of log (e.g., system, user_action, api_call, error, security, audit)'
  }
}, {
  tableName: 'log_type',
  timestamps: true,
  updatedAt: false // log_type only has created_at
});

// Log type IDs constants (to be set after initial data insert)
LogType.SYSTEM = 1;
LogType.USER_ACTION = 2;
LogType.API_CALL = 3;
LogType.ERROR = 4;
LogType.SECURITY = 5;
LogType.AUDIT = 6;

module.exports = LogType;
