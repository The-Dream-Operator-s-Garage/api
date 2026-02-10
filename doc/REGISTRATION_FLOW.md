# Registration Flow Documentation

## Overview

The registration process creates a new user entity in both PathChain and the database, maintaining referential integrity across all related tables.

## Database Relationships Maintained

### 1. Entity Table
- **Primary Key**: `id` (auto-increment)
- **Foreign Key**: `ancestor_id` → `entity.id`
  - References the parent entity that created the secret
  - Pioneer has `ancestor_id = NULL`
  - All other entities reference their creator

### 2. Login Table
- **Primary Key**: `id` (username)
- **Foreign Key**: `entity_id` → `entity.id`
  - Ensures login record references a valid entity
  - One-to-one relationship (one login per entity)

### 3. Secret Table
- **Primary Key**: `id` (auto-increment)
- **Foreign Keys**:
  - `owner_id` → `entity.id` (the entity that created/owns the secret)
  - `owner_type_id` → `owner_type.id` (references owner_type table, typically 1 = entity)

## Registration Flow Steps

### Step 1: Secret Validation
1. Normalize secret input (handle "secrets/hash" or "hash" formats)
2. Check if secret exists in PathChain
3. Verify secret is not already used
4. Get secret object to find the author (ancestor entity)

### Step 2: Find Ancestor Entity
1. Extract `author` field from secret object (PathChain path like "entities/{hash}")
2. Find ancestor entity in database by matching `entity.path = secretObj.author`
3. This ensures the ancestor exists before creating the new entity

### Step 3: Create Entity in PathChain
1. Call `pathchainUtil.createEntity(normalizedSecretHash)`
2. This creates the entity in PathChain filesystem
3. Returns entity hash

### Step 4: Get Entity Object
1. Retrieve entity object from PathChain using entity hash
2. Extract `tag` field (the PathChain path like "entities/{hash}")

### Step 5: Database Transaction (Atomic)
All database operations happen in a single transaction:

1. **Create Entity Record**:
   ```javascript
   Entity.create({
     path: entityObj.tag,        // PathChain path
     ancestor_id: ancestorEntity.id  // Foreign key to parent
   })
   ```
   - Foreign key constraint ensures `ancestorEntity.id` exists
   - Maintains entity hierarchy

2. **Update/Create Secret Record**:
   ```javascript
   Secret.create/update({
     path: `secrets/${normalizedSecretHash}`,
     owner_id: ancestorEntity.id,      // Foreign key to entity
     owner_type_id: OwnerType.ENTITY,  // Foreign key to owner_type
     used_at: new Date()
   })
   ```
   - Tracks secret usage
   - Maintains relationship to owner entity

3. **Commit Transaction**:
   - If any step fails, entire transaction rolls back
   - Ensures database consistency

### Step 6: Mark Secret as Used in PathChain
1. Call `pathchainUtil.useSecret(normalizedSecretHash)`
2. Updates PathChain file to mark secret as used
3. Done AFTER database commit (database is source of truth)

### Step 7: Create Login Record
1. Hash password using SHA256
2. Create login record:
   ```javascript
   Login.create({
     id: username,              // Primary key
     entity_id: entity.id,      // Foreign key to entity
     password: hashedPassword,
     secret: storedSecretHash   // For tracking
   })
   ```
   - Foreign key constraint ensures `entity.id` exists
   - One login per entity

### Step 8: Generate JWT Token
1. Create JWT token with entity information
2. Return token and entity data to client

## Error Handling

### Secret Already Used
- Checked before entity creation
- Returns `USED_SECRET` error code
- Prevents duplicate registrations

### Ancestor Not Found
- If `secretObj.author` doesn't match any `entity.path`
- Returns `ANCESTOR_NOT_FOUND` error
- Indicates database/PathChain mismatch

### Entity Creation Failure
- If PathChain returns error (e.g., "Updater not identified")
- Transaction rolls back
- Returns `ENTITY_RETRIEVAL_FAILED` error

### Database Constraint Violations
- Foreign key violations automatically caught by database
- Transaction rolls back
- Returns `DATABASE_ERROR`

## Database Integrity Guarantees

1. **Referential Integrity**: All foreign keys reference valid records
2. **Atomicity**: Transaction ensures all-or-nothing operations
3. **Consistency**: Entity hierarchy always valid (ancestor exists)
4. **Uniqueness**: Username (login.id) is unique, entity paths are unique

## REFRESH Command

To reset everything and start fresh:

```bash
node app.js REFRESH
```

Or:
```bash
npm start REFRESH
```

This will:
1. Delete all PathChain files (`files/` directory)
2. Truncate all database tables (preserves schema)
3. Allow fresh initialization on next server start
