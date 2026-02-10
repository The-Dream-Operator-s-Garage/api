const { TLog, LogType, ActionType } = require('../models');

/**
 * Log Service
 * Provides helper functions for creating and querying log entries.
 * Simplifies logging throughout the application by wrapping TLog model methods.
 */

/**
 * Create a log entry
 * @param {Object} logData - Log entry data
 * @param {Number|null} logData.ownerId - Entity ID that performed the action (null for system actions)
 * @param {Number} logData.logTypeId - Log type ID (use LogType constants)
 * @param {Number} logData.actionTypeId - Action type ID (use ActionType constants)
 * @param {Date|null} logData.startTimestamp - Start timestamp (optional)
 * @param {String} logData.startMoment - Start moment (PathChain format or ISO string)
 * @param {Date|null} logData.finishTimestamp - Finish timestamp (optional)
 * @param {String} logData.finishMoment - Finish moment (PathChain format or ISO string)
 * @param {Number|null} logData.receiverId - Entity ID that received the action (optional)
 * @param {String|null} logData.pathId - Path reference (optional)
 * @param {Object|null} logData.metadata - Additional metadata (will be stringified to JSON)
 * @returns {Promise<TLog>} Created log entry
 */
async function createLog(logData) {
  try {
    const {
      ownerId = null,
      logTypeId,
      actionTypeId,
      startTimestamp = null,
      startMoment,
      finishTimestamp = null,
      finishMoment,
      receiverId = null,
      pathId = null,
      metadata = null
    } = logData;

    // Validate required fields
    if (!logTypeId || !actionTypeId) {
      throw new Error('logTypeId and actionTypeId are required');
    }

    if (!startMoment || !finishMoment) {
      throw new Error('startMoment and finishMoment are required');
    }

    return await TLog.createLog({
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
    });
  } catch (error) {
    console.error('Error creating log entry:', error);
    throw error;
  }
}

/**
 * Quick log for common actions
 * Automatically sets start and finish timestamps to now, and generates simple moment strings
 * @param {Number|null} ownerId - Entity ID that performed the action
 * @param {Number} logTypeId - Log type ID
 * @param {Number} actionTypeId - Action type ID
 * @param {String|null} pathId - Path reference (optional)
 * @param {Object|null} metadata - Additional metadata (optional)
 * @returns {Promise<TLog>} Created log entry
 */
async function quickLog(ownerId, logTypeId, actionTypeId, pathId = null, metadata = null) {
  const now = new Date();
  const momentString = now.toISOString();

  return await createLog({
    ownerId,
    logTypeId,
    actionTypeId,
    startTimestamp: now,
    startMoment: momentString,
    finishTimestamp: now,
    finishMoment: momentString,
    pathId,
    metadata
  });
}

/**
 * Log a user action
 * @param {Number} ownerId - Entity ID that performed the action
 * @param {Number} actionTypeId - Action type ID (use ActionType constants)
 * @param {String|null} pathId - Path reference (optional)
 * @param {Object|null} metadata - Additional metadata (optional)
 * @returns {Promise<TLog>} Created log entry
 */
async function logUserAction(ownerId, actionTypeId, pathId = null, metadata = null) {
  return await quickLog(ownerId, LogType.USER_ACTION, actionTypeId, pathId, metadata);
}

/**
 * Log an API call
 * @param {Number|null} ownerId - Entity ID making the API call (null for anonymous)
 * @param {String} pathId - API endpoint path
 * @param {Object|null} metadata - Request/response metadata (optional)
 * @returns {Promise<TLog>} Created log entry
 */
async function logApiCall(ownerId, pathId, metadata = null) {
  return await quickLog(ownerId, LogType.API_CALL, ActionType.READ, pathId, metadata);
}

/**
 * Log an error
 * @param {Number|null} ownerId - Entity ID associated with the error (null for system errors)
 * @param {Error} error - Error object
 * @param {String|null} pathId - Path where error occurred (optional)
 * @param {Object|null} additionalMetadata - Additional error context (optional)
 * @returns {Promise<TLog>} Created log entry
 */
async function logError(ownerId, error, pathId = null, additionalMetadata = null) {
  const metadata = {
    errorMessage: error.message,
    errorStack: error.stack,
    errorName: error.name,
    ...additionalMetadata
  };

  return await quickLog(ownerId, LogType.ERROR, ActionType.READ, pathId, metadata);
}

/**
 * Log a security event
 * @param {Number|null} ownerId - Entity ID involved in the security event
 * @param {Number} actionTypeId - Action type ID (e.g., LOGIN, LOGOUT)
 * @param {String|null} pathId - Path reference (optional)
 * @param {Object|null} metadata - Security event metadata (optional)
 * @returns {Promise<TLog>} Created log entry
 */
async function logSecurityEvent(ownerId, actionTypeId, pathId = null, metadata = null) {
  return await quickLog(ownerId, LogType.SECURITY, actionTypeId, pathId, metadata);
}

/**
 * Get logs by entity (owner)
 * @param {Number} entityId - Entity ID
 * @param {Object} options - Query options (limit, offset, logTypeId, actionTypeId)
 * @returns {Promise<Array<TLog>>} Log entries
 */
async function getLogsByEntity(entityId, options = {}) {
  try {
    const whereClause = { owner_id: entityId };
    
    if (options.logTypeId) {
      whereClause.log_type_id = options.logTypeId;
    }
    
    if (options.actionTypeId) {
      whereClause.action_type_id = options.actionTypeId;
    }

    return await TLog.findAll({
      where: whereClause,
      limit: options.limit || 50,
      offset: options.offset || 0,
      order: [['created_at', 'DESC']],
      include: [
        { model: LogType, as: 'logType' },
        { model: ActionType, as: 'actionType' }
      ]
    });
  } catch (error) {
    console.error('Error retrieving logs by entity:', error);
    throw error;
  }
}

/**
 * Get recent system logs
 * @param {Object} options - Query options (limit, offset, logTypeId)
 * @returns {Promise<Array<TLog>>} Log entries
 */
async function getSystemLogs(options = {}) {
  try {
    const whereClause = { owner_id: null };
    
    if (options.logTypeId) {
      whereClause.log_type_id = options.logTypeId;
    }

    return await TLog.findAll({
      where: whereClause,
      limit: options.limit || 100,
      offset: options.offset || 0,
      order: [['created_at', 'DESC']],
      include: [
        { model: LogType, as: 'logType' },
        { model: ActionType, as: 'actionType' }
      ]
    });
  } catch (error) {
    console.error('Error retrieving system logs:', error);
    throw error;
  }
}

/**
 * Get logs by time range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Query options (limit, offset, ownerId, logTypeId, actionTypeId)
 * @returns {Promise<Array<TLog>>} Log entries
 */
async function getLogsByTimeRange(startDate, endDate, options = {}) {
  try {
    const { Op } = require('sequelize');
    const whereClause = {
      created_at: {
        [Op.between]: [startDate, endDate]
      }
    };
    
    if (options.ownerId !== undefined) {
      whereClause.owner_id = options.ownerId;
    }
    
    if (options.logTypeId) {
      whereClause.log_type_id = options.logTypeId;
    }
    
    if (options.actionTypeId) {
      whereClause.action_type_id = options.actionTypeId;
    }

    return await TLog.findAll({
      where: whereClause,
      limit: options.limit || 100,
      offset: options.offset || 0,
      order: [['created_at', 'DESC']],
      include: [
        { model: LogType, as: 'logType' },
        { model: ActionType, as: 'actionType' }
      ]
    });
  } catch (error) {
    console.error('Error retrieving logs by time range:', error);
    throw error;
  }
}

module.exports = {
  createLog,
  quickLog,
  logUserAction,
  logApiCall,
  logError,
  logSecurityEvent,
  getLogsByEntity,
  getSystemLogs,
  getLogsByTimeRange,
  // Export constants for convenience
  LogType,
  ActionType
};
