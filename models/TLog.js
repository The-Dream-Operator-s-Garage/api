const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TLog Model (Temporal Log)
 * Main logging table for tracking actions within the system.
 * Records who performed an action, what type of action, on what path, and when.
 * 
 * Relationships:
 * - owner_id: Entity that performed the action (nullable - system actions have no owner)
 * - receiver_id: Entity that received the action (nullable - not all actions have a receiver)
 * - log_type_id: Type of log entry (required)
 * - action_type_id: Type of action performed (required)
 * - path_id: Reference to a path within the system (text field for flexibility)
 */
const TLog = sequelize.define('TLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'entity',
      key: 'id'
    },
    comment: 'Entity that performed the action (null for system actions)'
  },
  log_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'log_type',
      key: 'id'
    },
    comment: 'Type of log entry'
  },
  action_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'action_type',
      key: 'id'
    },
    comment: 'Type of action performed'
  },
  start_timestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the action started (Unix timestamp)'
  },
  start_moment: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'PathChain moment reference for start time'
  },
  finish_timestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the action finished (Unix timestamp)'
  },
  finish_moment: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'PathChain moment reference for finish time'
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'entity',
      key: 'id'
    },
    comment: 'Entity that received the action (null if not applicable)'
  },
  path_id: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reference to a path within the system (PathChain path or URL)'
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional metadata as JSON string'
  }
}, {
  tableName: 'tlog',
  timestamps: true,
  updatedAt: false // tlog only has created_at
});

/**
 * Helper method to create a log entry
 * @param {Object} logData - Log entry data
 * @returns {Promise<TLog>} Created log entry
 */
TLog.createLog = async function(logData) {
  const {
    ownerId,
    logTypeId,
    actionTypeId,
    startTimestamp,
    startMoment,
    finishTimestamp,
    finishMoment,
    receiverId,
    pathId,
    metadata
  } = logData;

  return await this.create({
    owner_id: ownerId,
    log_type_id: logTypeId,
    action_type_id: actionTypeId,
    start_timestamp: startTimestamp,
    start_moment: startMoment,
    finish_timestamp: finishTimestamp,
    finish_moment: finishMoment,
    receiver_id: receiverId,
    path_id: pathId,
    metadata: metadata ? JSON.stringify(metadata) : null
  });
};

/**
 * Get logs by owner (entity)
 * @param {Number} ownerId - Entity ID
 * @param {Object} options - Query options (limit, offset, etc.)
 * @returns {Promise<Array<TLog>>} Log entries
 */
TLog.getByOwner = async function(ownerId, options = {}) {
  return await this.findAll({
    where: { owner_id: ownerId },
    limit: options.limit || 50,
    offset: options.offset || 0,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

/**
 * Get logs by action type
 * @param {Number} actionTypeId - Action type ID
 * @param {Object} options - Query options
 * @returns {Promise<Array<TLog>>} Log entries
 */
TLog.getByActionType = async function(actionTypeId, options = {}) {
  return await this.findAll({
    where: { action_type_id: actionTypeId },
    limit: options.limit || 50,
    offset: options.offset || 0,
    order: [['created_at', 'DESC']],
    include: options.include || []
  });
};

module.exports = TLog;
