# Authentication System Documentation

## Overview

The authentication system bridges PathChain and the database system, providing user registration, login, and session management. It maintains PathChain integrity while storing relational data in the database for efficient querying.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (UI)                          │
│    index.html / auth-component.html                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP Requests
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Routes                           │
│              routes/authRoutes.js                           │
│   /api/identity/register, /login, /secret, /verify          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                         │
│            controllers/authController.js                    │
│        Request validation & response formatting             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│             services/authService.js                         │
│        Business logic & PathChain integration               │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐        ┌─────────────────────────────┐
│     PathChain        │        │        Database             │
│   (File Storage)     │        │      (MariaDB/MySQL)        │
│  Protocol Buffers    │        │    Sequelize Models         │
│   files/entities/    │        │   entity, login, secret     │
│   files/secrets/     │        │                             │
│   files/moments/     │        │                             │
└──────────────────────┘        └─────────────────────────────┘
```

## PathChain Integrity Considerations

### Entity Chain Behavior

1. **Pioneer Entity**: The first entity in PathChain, created without a secret. It has itself as its ancestor and is the root of all entity hierarchies.

2. **Entity Hierarchy**: Each new entity must:
   - Be created using a valid, unused secret
   - Reference the secret owner as its ancestor in PathChain
   - Store the PathChain path in the database `entity.path` field
   - Maintain ancestor relationships in both PathChain and database

3. **Secret Usage**: 
   - Secrets are single-use tokens created by existing entities
   - Once used, they cannot be reused (marked with `used_at` timestamp)
   - Each secret is owned by an entity (the author)
   - When used, the secret creates a new entity with the author as ancestor

4. **Path Synchronization**:
   - Entity paths from PathChain are stored in the database `entity.path` field
   - Format: `entities/{hash}` or `{author}/entities/{hash}`
   - Ancestor relationships maintained via `entity.ancestor_id` in database

## API Endpoints

### POST /api/identity/register

Register a new user using a secret.

**Request Body:**
```json
{
  "secret": "secret_hash_here",  // Optional if no pioneer exists
  "id": "username",              // Required, max 255 characters
  "password": "user_password"    // Required
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "jwt_token_here",
  "entity": {
    "id": 1,
    "path": "entities/abc123...",
    "username": "username"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": {
    "code": 40100,
    "message": "Error description"
  }
}
```

#### Special Case: Pioneer Creation

If no pioneer exists in PathChain and no secret is provided:
1. Create pioneer in PathChain (automatically creates pioneer entity and secret)
2. Save pioneer entity to database (ancestor_id = null)
3. Log pioneer secret to console
4. Associate the registering user with the pioneer entity
5. Create login record with hashed password
6. Generate JWT token

### POST /api/identity/login

Login with username and password.

**Request Body:**
```json
{
  "username": "username",
  "password": "user_password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "entity": {
    "id": 1,
    "path": "entities/abc123...",
    "username": "username"
  }
}
```

### POST /api/identity/secret

Login with a secret (alternative authentication).

**Request Body:**
```json
{
  "secret": "secret_string_or_hash"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Secret login successful",
  "token": "jwt_token_here",
  "entity": {
    "id": 1,
    "path": "entities/abc123...",
    "username": "username"
  }
}
```

### GET /api/identity/status

Get system initialization status.

**Response (200):**
```json
{
  "success": true,
  "status": {
    "initialized": true,
    "pioneer": {
      "id": 1,
      "path": "entities/abc123..."
    },
    "counts": {
      "entities": 5,
      "logins": 5,
      "secrets": 10
    },
    "pathchain": {
      "available": true
    }
  }
}
```

### POST /api/identity/init

Initialize the system (create pioneer) if not already initialized.

**Response (200):**
```json
{
  "success": true,
  "message": "System initialized",
  "pioneer": {
    "id": 1,
    "path": "entities/abc123..."
  },
  "isNew": true
}
```

### GET /api/identity/verify

Verify JWT token (requires Authorization header).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "entityId": 1,
    "username": "username",
    "path": "entities/abc123...",
    "iat": 1704000000,
    "exp": 1704086400
  }
}
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 40100 | INVALID_SECRET | Secret does not exist |
| 40101 | USED_SECRET | Secret has already been used |
| 40102 | INVALID_REQUEST | Missing required fields or invalid parameters |
| 40103 | INVALID_CREDENTIALS | Invalid username or password |
| 40104 | INVALID_TOKEN | JWT token is invalid or expired |
| 40105 | ANCESTOR_NOT_FOUND | Ancestor entity not found in database |
| 40106 | USERNAME_EXISTS | Username already exists |
| 50001 | PIONEER_CREATION_FAILED | Failed to create pioneer |
| 50002 | PIONEER_SECRET_NOT_FOUND | Pioneer created but secret not found |
| 50003 | ENTITY_RETRIEVAL_FAILED | Failed to retrieve entity from PathChain |
| 50004 | PIONEER_RETRIEVAL_FAILED | Failed to retrieve pioneer from PathChain |
| 50005 | DATABASE_ERROR | General database error |

## File Structure

```
api/
├── config/
│   └── database.js          # Sequelize configuration
├── models/
│   ├── index.js             # Model loader and associations
│   ├── Entity.js            # Entity model
│   ├── Login.js             # Login model
│   ├── Secret.js            # Secret model
│   └── OwnerType.js         # Owner type lookup model
├── routes/
│   └── authRoutes.js        # Authentication routes
├── controllers/
│   └── authController.js    # Authentication controller
├── services/
│   └── authService.js       # Authentication business logic
└── utils/
    ├── jwt.js               # JWT utilities
    ├── crypto.js            # Password hashing (SHA256)
    └── pathchain.js         # PathChain wrapper utilities
```

## Database Models

### Entity
- `id` (INT, PK): Auto-increment primary key
- `path` (TEXT): PathChain entity tag (e.g., "entities/{hash}")
- `ancestor_id` (INT, FK): Reference to parent entity (null for pioneer)
- `created_at`, `updated_at` (TIMESTAMP)

### Login
- `id` (VARCHAR(255), PK): Username/email
- `entity_id` (INT, FK): Reference to entity
- `password` (TEXT): SHA256 hashed password
- `secret` (TEXT): PathChain secret hash used for registration
- `created_at`, `updated_at` (TIMESTAMP)

### Secret
- `id` (INT, PK): Auto-increment primary key
- `path` (TEXT): PathChain secret tag
- `owner_id` (INT): Entity that owns this secret
- `owner_type_id` (INT, FK): Reference to owner_type (1 = entity)
- `used_at` (TIMESTAMP): When secret was used
- `created_at`, `updated_at` (TIMESTAMP)

## Security

- Passwords are hashed using SHA256
- JWT tokens are used for session management
- Tokens expire after 24 hours (configurable via JWT_EXPIRY env var)
- Secrets are validated before use
- Username uniqueness is enforced at database level

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pathos_db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Environment
NODE_ENV=development
```

## Registration Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│  PathChain  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │  POST /register   │                   │
      │  {secret, id,     │                   │
      │   password}       │                   │
      │──────────────────▶│                   │
      │                   │                   │
      │                   │  isSecretUsed()   │
      │                   │──────────────────▶│
      │                   │◀──────────────────│
      │                   │                   │
      │                   │  makeEntity()     │
      │                   │──────────────────▶│
      │                   │◀──────────────────│
      │                   │                   │
      │                   │  useSecret()      │
      │                   │──────────────────▶│
      │                   │◀──────────────────│
      │                   │                   │
      │                   ├───────────────────┤
      │                   │    Database       │
      │                   │                   │
      │                   │  Entity.create()  │
      │                   │  Login.create()   │
      │                   │  Secret.update()  │
      │                   ├───────────────────┤
      │                   │                   │
      │  {token, entity}  │                   │
      │◀──────────────────│                   │
      │                   │                   │
```

## Integration Notes1. **Entity Mapping**: PathChain entities map to the `entity` table via the `path` field
2. **Secret Tracking**: Both PathChain and database track secret usage
3. **Ancestor Chain**: Maintained in both systems for integrity verification
4. **Backtracking**: All events can be traced through PathChain's immutable structure
