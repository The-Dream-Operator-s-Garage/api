# Logging System Documentation

## Overview

The TPathos logging system (`tlog`) provides comprehensive audit trails and action tracking throughout the application. It records temporal information about who performed actions, what they did, when it happened, and on what resources.

## Architecture

The logging system consists of three main tables:

1. **`log_type`** - Categorizes logs (system, user_action, api_call, error, security, audit)
2. **`action_type`** - Standardizes action names (create, read, update, delete, login, logout, register, view)
3. **`tlog`** - Main log entries with temporal information and relationships

## Features

- **Dual Time Representation**: Both Unix timestamps and PathChain moments
- **Entity Relationships**: Tracks both performer (owner) and receiver of actions
- **Flexible Metadata**: JSON metadata field for additional context
- **Path References**: Links logs to specific paths/resources in the system
- **Indexed Queries**: Efficient retrieval by time, entity, type, or action

## Usage

### Basic Logging

```javascript
const logService = require('./services/logService');

// Quick log a user action
await logService.logUserAction(
  entityId,                    // Who performed the action
  ActionType.CREATE,           // What action type
  '/api/posts/123',           // Where (optional)
  { postTitle: 'My Post' }    // Additional context (optional)
);

// Log an API call
await logService.logApiCall(
  entityId,                    // Who made the call (null for anonymous)
  '/api/greeting',            // API endpoint
  { 
    method: 'GET', 
    statusCode: 200,
    responseTime: 45 
  }
);

// Log an error
await logService.logError(
  entityId,                    // Who encountered the error (null for system)
  error,                       // Error object
  '/api/user/profile',        // Where error occurred (optional)
  { userId: 123 }             // Additional context (optional)
);

// Log a security event
await logService.logSecurityEvent(
  entityId,
  ActionType.LOGIN,
  '/api/login',
  { 
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...' 
  }
);
```

### Advanced Logging

```javascript
const { TLog, LogType, ActionType } = require('./models');

// Create a detailed log entry with custom timestamps
await logService.createLog({
  ownerId: entityId,
  logTypeId: LogType.AUDIT,
  actionTypeId: ActionType.UPDATE,
  startTimestamp: new Date('2025-06-13T10:00:00Z'),
  startMoment: 'moments/abc123...',
  finishTimestamp: new Date('2025-06-13T10:00:05Z'),
  finishMoment: 'moments/def456...',
  receiverId: targetEntityId,  // Optional: who received the action
  pathId: 'entities/xyz789...',
  metadata: {
    changedFields: ['name', 'email'],
    oldValues: { name: 'John', email: 'john@old.com' },
    newValues: { name: 'John Doe', email: 'john@new.com' }
  }
});
```

### Querying Logs

```javascript
// Get all logs for a specific entity
const userLogs = await logService.getLogsByEntity(entityId, {
  limit: 50,
  offset: 0,
  logTypeId: LogType.USER_ACTION,  // Optional filter
  actionTypeId: ActionType.CREATE  // Optional filter
});

// Get system logs
const systemLogs = await logService.getSystemLogs({
  limit: 100,
  logTypeId: LogType.ERROR
});

// Get logs by time range
const logs = await logService.getLogsByTimeRange(
  new Date('2025-06-01'),
  new Date('2025-06-30'),
  {
    ownerId: entityId,           // Optional filter by entity
    logTypeId: LogType.SECURITY, // Optional filter by log type
    limit: 100
  }
);

// Direct model queries for complex needs
const { Op } = require('sequelize');
const recentErrorLogs = await TLog.findAll({
  where: {
    log_type_id: LogType.ERROR,
    created_at: {
      [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  },
  include: [
    { model: LogType, as: 'logType' },
    { model: ActionType, as: 'actionType' },
    { model: Entity, as: 'owner' }
  ],
  order: [['created_at', 'DESC']],
  limit: 50
});
```

## Log Types

### Pre-populated Log Types

| ID | Type Name    | Description                                    |
|----|--------------|------------------------------------------------|
| 1  | system       | System-level events and operations             |
| 2  | user_action  | User-initiated actions                         |
| 3  | api_call     | API endpoint calls                             |
| 4  | error        | Error events                                   |
| 5  | security     | Security-related events (auth, permissions)    |
| 6  | audit        | Audit trail for compliance                     |

### Constants Usage

```javascript
const { LogType } = require('./services/logService');

// Access constants
LogType.SYSTEM       // 1
LogType.USER_ACTION  // 2
LogType.API_CALL     // 3
LogType.ERROR        // 4
LogType.SECURITY     // 5
LogType.AUDIT        // 6
```

## Action Types

### Pre-populated Action Types

| ID | Type Name | Description                     |
|----|-----------|----------------------------------|
| 1  | create    | Creating new resources          |
| 2  | read      | Reading/viewing resources       |
| 3  | update    | Updating existing resources     |
| 4  | delete    | Deleting resources              |
| 5  | login     | User login events               |
| 6  | logout    | User logout events              |
| 7  | register  | User registration events        |
| 8  | view      | Viewing/accessing resources     |

### Constants Usage

```javascript
const { ActionType } = require('./services/logService');

// Access constants
ActionType.CREATE    // 1
ActionType.READ      // 2
ActionType.UPDATE    // 3
ActionType.DELETE    // 4
ActionType.LOGIN     // 5
ActionType.LOGOUT    // 6
ActionType.REGISTER  // 7
ActionType.VIEW      // 8
```

## Best Practices

### 1. Use Appropriate Log Types
- **system**: Background jobs, scheduled tasks, system initialization
- **user_action**: User-initiated CRUD operations, form submissions
- **api_call**: REST API calls, webhooks, external integrations
- **error**: Exceptions, validation failures, runtime errors
- **security**: Authentication, authorization, permission changes
- **audit**: Compliance-related events, data access for sensitive information

### 2. Include Meaningful Metadata
```javascript
// Good: Include relevant context
await logService.logUserAction(userId, ActionType.UPDATE, '/api/profile', {
  changedFields: ['email', 'phone'],
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

// Avoid: Empty or unhelpful metadata
await logService.logUserAction(userId, ActionType.UPDATE, '/api/profile', {
  action: 'updated' // Too generic
});
```

### 3. Log Security Events
Always log authentication and authorization events:
```javascript
// Successful login
await logService.logSecurityEvent(entityId, ActionType.LOGIN, '/api/login', {
  ipAddress: req.ip,
  success: true
});

// Failed login attempt
await logService.logSecurityEvent(null, ActionType.LOGIN, '/api/login', {
  username: username,
  ipAddress: req.ip,
  success: false,
  reason: 'Invalid credentials'
});
```

### 4. Log Errors with Context
```javascript
try {
  // Some operation
} catch (error) {
  await logService.logError(userId, error, req.path, {
    requestBody: req.body,
    params: req.params,
    query: req.query
  });
  throw error;
}
```

### 5. Use PathChain Moments
When PathChain is available, use PathChain moments for temporal consistency:
```javascript
const pathchainUtil = require('./utils/pathchainUtil');

const startMoment = await pathchainUtil.getMoment();
// ... perform action ...
const finishMoment = await pathchainUtil.getMoment();

await logService.createLog({
  ownerId: entityId,
  logTypeId: LogType.USER_ACTION,
  actionTypeId: ActionType.CREATE,
  startTimestamp: new Date(),
  startMoment: startMoment,
  finishTimestamp: new Date(),
  finishMoment: finishMoment,
  pathId: entityPath
});
```

## Performance Considerations

1. **Batch Logging**: For high-volume operations, consider batching log entries
2. **Async Logging**: Use async/await but don't block critical paths
3. **Index Usage**: Queries on `created_at`, `owner_id`, `receiver_id` are indexed
4. **Retention Policy**: Implement log rotation/archival for old entries

## Example Integration

### In Controllers

```javascript
const logService = require('../services/logService');
const { ActionType } = logService;

exports.createPost = async (req, res) => {
  try {
    const post = await Post.create(req.body);
    
    // Log the action
    await logService.logUserAction(
      req.user.id,
      ActionType.CREATE,
      `/api/posts/${post.id}`,
      { postTitle: post.title, postType: post.type }
    );
    
    res.json({ success: true, post });
  } catch (error) {
    await logService.logError(req.user.id, error, req.path);
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### In Middleware

```javascript
// API logging middleware
app.use(async (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id || null;
    
    await logService.logApiCall(userId, req.path, {
      method: req.method,
      statusCode: res.statusCode,
      duration: duration,
      ip: req.ip
    });
  });
  
  next();
});
```

## Extending the System

### Adding New Log Types

1. Insert into `log_type` table:
```sql
INSERT INTO log_type (type_name) VALUES ('custom_type');
```

2. Update `LogType` model constants:
```javascript
// models/LogType.js
LogType.CUSTOM_TYPE = 7;
```

### Adding New Action Types

1. Insert into `action_type` table:
```sql
INSERT INTO action_type (type_name) VALUES ('custom_action');
```

2. Update `ActionType` model constants:
```javascript
// models/ActionType.js
ActionType.CUSTOM_ACTION = 9;
```
