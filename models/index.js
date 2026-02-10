const { sequelize } = require('../config/database');
const OwnerType = require('./OwnerType');
const Entity = require('./Entity');
const Login = require('./Login');
const Secret = require('./Secret');
const LogType = require('./LogType');
const ActionType = require('./ActionType');
const TLog = require('./TLog');

// Define associations

// Entity self-referential (ancestor hierarchy)
Entity.belongsTo(Entity, {
  as: 'ancestor',
  foreignKey: 'ancestor_id'
});
Entity.hasMany(Entity, {
  as: 'descendants',
  foreignKey: 'ancestor_id'
});

// Login -> Entity relationship
Login.belongsTo(Entity, {
  foreignKey: 'entity_id',
  as: 'entity'
});
Entity.hasMany(Login, {
  foreignKey: 'entity_id',
  as: 'logins'
});

// Secret -> OwnerType relationship
Secret.belongsTo(OwnerType, {
  foreignKey: 'owner_type_id',
  as: 'ownerType'
});

// TLog -> Entity relationship (owner)
TLog.belongsTo(Entity, {
  foreignKey: 'owner_id',
  as: 'owner'
});
Entity.hasMany(TLog, {
  foreignKey: 'owner_id',
  as: 'logs'
});

// TLog -> Entity relationship (receiver)
TLog.belongsTo(Entity, {
  foreignKey: 'receiver_id',
  as: 'receiver'
});
Entity.hasMany(TLog, {
  foreignKey: 'receiver_id',
  as: 'receivedLogs'
});

// TLog -> LogType relationship
TLog.belongsTo(LogType, {
  foreignKey: 'log_type_id',
  as: 'logType'
});
LogType.hasMany(TLog, {
  foreignKey: 'log_type_id',
  as: 'logs'
});

// TLog -> ActionType relationship
TLog.belongsTo(ActionType, {
  foreignKey: 'action_type_id',
  as: 'actionType'
});
ActionType.hasMany(TLog, {
  foreignKey: 'action_type_id',
  as: 'logs'
});

// Sync models (without altering existing tables)
const syncModels = async () => {
  try {
    // Don't sync - tables already exist from SQL schema
    // await sequelize.sync({ alter: false });
    console.log('Models loaded successfully.');
    return true;
  } catch (error) {
    console.error('Error loading models:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  syncModels,
  OwnerType,
  Entity,
  Login,
  Secret,
  LogType,
  ActionType,
  TLog
};

