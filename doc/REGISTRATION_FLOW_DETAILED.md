# Registration Flow - Detailed Documentation

This document details every step required before and during entity creation in PathChain during user registration.

## Overview

The registration flow creates a new user entity in both PathChain and the database, maintaining referential integrity across all related tables.

## Prerequisites Checklist

Before attempting to create an entity in PathChain, the following must be verified:

### 1. PathChain System Initialization
- ✅ Pioneer entity must exist in PathChain
- ✅ Pioneer entity must exist in database (`entity` table)
- ✅ Pioneer secret must exist in PathChain filesystem
- ✅ Pioneer secret must exist in database (`secret` table)

### 2. Secret Validation
- ✅ Secret hash must be normalized (extract hash from `secrets/hash` format if needed)
- ✅ Secret must exist in PathChain filesystem
- ✅ Secret must NOT be used (`isSecretUsed()` returns `false`)
- ✅ Secret object must be retrievable from PathChain
- ✅ Secret object must have a valid `author` field (points to ancestor entity)

### 3. Ancestor Entity Verification
- ✅ Ancestor entity (from secret's `author` field) must exist in database
- ✅ Ancestor entity must have a valid `id` (primary key) for foreign key reference
- ✅ Ancestor entity's `path` must match secret's `author` path

### 4. Database Schema Integrity
- ✅ `entity` table must exist with columns: `id`, `path`, `ancestor_id`
- ✅ `secret` table must exist with columns: `id`, `path`, `owner_id`, `owner_type_id`, `used_at`
- ✅ `login` table must exist with columns: `id`, `entity_id`, `password`, `secret`
- ✅ `owner_type` table must exist with `id` and `type_name`
- ✅ Foreign key constraints must be properly defined

## Registration Flow Steps

### Step 1: Input Validation
**Location:** `services/authService.js` - `register()` function

**Checks:**
- Username must be provided and ≤ 255 characters
- Password must be provided and meet requirements
- Secret hash must be provided

**Code:**
```javascript
if (!username || username.length > 255) {
  return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Invalid username' } };
}
if (!password || password.length < 8) {
  return { success: false, error: { code: ErrorCodes.INVALID_INPUT, message: 'Password must be at least 8 characters' } };
}
if (!secretHash) {
  return { success: false, error: { code: ErrorCodes.INVALID_SECRET, message: 'Secret is required' } };
}
```

---

### Step 2: Secret Normalization
**Location:** `services/authService.js` - `register()` function

**Action:**
- Normalize secret input to extract hash from `secrets/hash` or use hash directly

**Code:**
```javascript
const normalizedSecretHash = pathchainUtil.normalizeSecretHash(secretHash);
```

**Example:**
- Input: `"secrets/f86596328091f21dc2cf9ccab474dedd0775c6babfcfe05c91dd5df930bfd9ce"` → Output: `"f86596328091f21dc2cf9ccab474dedd0775c6babfcfe05c91dd5df930bfd9ce"`
- Input: `"f86596328091f21dc2cf9ccab474dedd0775c6babfcfe05c91dd5df930bfd9ce"` → Output: `"f86596328091f21dc2cf9ccab474dedd0775c6babfcfe05c91dd5df930bfd9ce"`

---

### Step 3: Secret Usage Check
**Location:** `services/authService.js` - `register()` function

**Action:**
- Check if secret is already used in PathChain

**Code:**
```javascript
const isUsed = pathchainUtil.isSecretUsed(normalizedSecretHash);
if (isUsed === true) {
  return { success: false, error: { code: ErrorCodes.USED_SECRET, message: 'Secret has already been used' } };
}
```

**PathChain Check:**
- Calls `pathchain.isSecretUsed(secretHash)`
- Returns `true` if secret is marked as used
- Returns `false` if secret is available

---

### Step 4: Retrieve Secret Object
**Location:** `services/authService.js` - `register()` function

**Action:**
- Get secret object from PathChain to find the author (ancestor entity)

**Code:**
```javascript
let secretObj;
try {
  secretObj = pathchainUtil.getSecret(normalizedSecretHash);
} catch (err) {
  // Handle error - secret not found
}
```

**Required Fields:**
- `secretObj.author` - Path to the ancestor entity (e.g., `"entities/{pioneerHash}"`)

**Error Handling:**
- If secret not found, return error
- If secret object is invalid, return error

---

### Step 5: Find Ancestor Entity in Database
**Location:** `services/authService.js` - `register()` function

**Action:**
- Find the ancestor entity in database using the secret's `author` path

**Code:**
```javascript
ancestorEntity = await Entity.findOne({
  where: { path: secretObj.author }
});
```

**Verification:**
- `ancestorEntity` must exist (not null)
- `ancestorEntity.id` must be valid (for foreign key reference)

**Error Handling:**
- If ancestor not found, return `ErrorCodes.ANCESTOR_NOT_FOUND`

---

### Step 6: Create Entity in PathChain
**Location:** `services/authService.js` - `register()` function

**Action:**
- Create new entity in PathChain using the normalized secret hash

**Code:**
```javascript
let entityHash;
try {
  entityHash = pathchainUtil.createEntity(normalizedSecretHash);
} catch (err) {
  // Handle exception
}
```

**PathChain Behavior:**
- `pathchain.makeEntity(secretHash)` returns:
  - **Success:** 64-character hexadecimal hash (entity hash)
  - **Error:** Error message string (e.g., "Secret has been already used or it was not found")

**Validation:**
- Check if result is a valid 64-char hex hash: `/^[a-f0-9]{64}$/i.test(entityHash)`
- If not valid hash, check for error keywords: "error", "used", "already", "not found", etc.

**Critical:** PathChain returns a **string** for both success and error cases. The code must distinguish between:
- Valid hash: `"21a07cc06cfdb2ebf429f073556c7484b66ca7798a4044b003a6a50298628252"` (64 hex chars)
- Error message: `"Secret has been already used or it was not found"` (contains error keywords)

---

### Step 7: Retrieve Entity Object from PathChain
**Location:** `services/authService.js` - `register()` function

**Action:**
- Retrieve the entity object to get its `tag` (path) for database storage

**Code:**
```javascript
let entityObj = pathchainUtil.getEntity(entityHash);
// If that fails, try with author path:
entityObj = pathchainUtil.getEntity(entityHash, secretObj.author);
// If that fails, try getObject:
entityObj = pathchainUtil.getObject(`entities/${entityHash}`);
```

**Required Fields:**
- `entityObj.tag` - Full path to entity (e.g., `"entities/{entityHash}"`)
- `entityObj.ancestor` - Path to ancestor entity
- `entityObj.register` - Registration moment path

**Error Handling:**
- Try multiple retrieval methods
- If all fail, return `ErrorCodes.ENTITY_RETRIEVAL_FAILED`

---

### Step 8: Database Transaction - Create Entity Record
**Location:** `services/authService.js` - `register()` function

**Action:**
- Start database transaction
- Create entity record with proper foreign key reference

**Code:**
```javascript
const transaction = await sequelize.transaction();
try {
  entity = await Entity.create({
    path: entityObj.tag,           // e.g., "entities/21a07cc0..."
    ancestor_id: ancestorEntity.id // Foreign key to parent entity
  }, { transaction });
```

**Foreign Key Constraint:**
- `ancestor_id` must reference a valid `entity.id`
- Database will enforce referential integrity

---

### Step 9: Database Transaction - Update/Create Secret Record
**Location:** `services/authService.js` - `register()` function

**Action:**
- Mark secret as used in database

**Code:**
```javascript
const secretPath = `secrets/${normalizedSecretHash}`;
let dbSecret = await Secret.findOne({ where: { path: secretPath }, transaction });

if (dbSecret) {
  dbSecret.used_at = new Date();
  await dbSecret.save({ transaction });
} else {
  dbSecret = await Secret.create({
    path: secretPath,
    owner_id: ancestorEntity.id,      // Foreign key to entity table
    owner_type_id: OwnerType.ENTITY,  // Foreign key to owner_type table
    used_at: new Date()
  }, { transaction });
}
```

**Foreign Key Constraints:**
- `owner_id` must reference a valid `entity.id`
- `owner_type_id` must reference a valid `owner_type.id`

---

### Step 10: Database Transaction - Create Login Record
**Location:** `services/authService.js` - `register()` function

**Action:**
- Create login record linking username to entity

**Code:**
```javascript
const hashedPassword = hashPassword(password);
await Login.create({
  id: username,                    // Primary key (username)
  entity_id: entity.id,            // Foreign key to entity table
  password: hashedPassword,
  secret: normalizedSecretHash || null
}, { transaction });
```

**Foreign Key Constraint:**
- `entity_id` must reference a valid `entity.id`

---

### Step 11: Commit Transaction
**Location:** `services/authService.js` - `register()` function

**Action:**
- Commit all database changes atomically

**Code:**
```javascript
await transaction.commit();
```

**If any step fails:**
- Transaction automatically rolls back
- All database changes are reverted
- Maintains database integrity

---

### Step 12: Mark Secret as Used in PathChain
**Location:** `services/authService.js` - `register()` function

**Action:**
- Mark secret as used in PathChain (after database commit)

**Code:**
```javascript
try {
  pathchainUtil.useSecret(normalizedSecretHash);
} catch (err) {
  console.warn('Warning: Could not mark secret as used in PathChain:', err.message);
}
```

**Note:** This happens after database commit to ensure data consistency. If PathChain update fails, the database already has the correct state.

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Username or password validation failed |
| `INVALID_SECRET` | Secret is missing or invalid |
| `USED_SECRET` | Secret has already been used |
| `ANCESTOR_NOT_FOUND` | Ancestor entity not found in database |
| `ENTITY_RETRIEVAL_FAILED` | Failed to create or retrieve entity from PathChain |

---

## Database Schema Relationships

```
entity
├── id (PK)
├── path (unique)
└── ancestor_id (FK → entity.id)

secret
├── id (PK)
├── path (unique)
├── owner_id (FK → entity.id)
├── owner_type_id (FK → owner_type.id)
└── used_at

login
├── id (PK, username)
├── entity_id (FK → entity.id)
├── password
└── secret

owner_type
├── id (PK)
└── type_name
```

---

## Common Issues and Solutions

### Issue: "Failed to create entity in PathChain: {hash}"
**Cause:** The hash is actually a valid entity hash (success), but the code treats it as an error.

**Solution:** Validate hash format - a 64-character hex string is a valid hash, not an error.

### Issue: "Updater not identified"
**Cause:** Secret is already used or PathChain state is inconsistent.

**Solution:** Check secret usage before attempting entity creation. Reset PathChain if needed.

### Issue: "Ancestor entity not found"
**Cause:** Secret's `author` path doesn't match any entity in database.

**Solution:** Ensure pioneer entity exists in database with correct path.

### Issue: Foreign key constraint violation
**Cause:** Referenced entity/owner_type doesn't exist.

**Solution:** Verify all foreign key references exist before creating records.

---

## Testing Checklist

Before testing registration:

1. ✅ Pioneer exists in PathChain
2. ✅ Pioneer exists in database
3. ✅ Pioneer secret exists and is unused
4. ✅ Secret object has valid `author` field
5. ✅ Ancestor entity exists in database
6. ✅ All database tables exist with proper constraints
7. ✅ PathChain filesystem is accessible

---

## Debugging Tips

1. **Enable detailed logging:** Check console output for each step
2. **Verify PathChain state:** Check `files/` directory structure
3. **Check database state:** Query `entity`, `secret`, `login` tables
4. **Validate hashes:** Ensure all hashes are 64-character hex strings
5. **Test secret retrieval:** Verify `getSecret()` returns valid object
6. **Test entity retrieval:** Verify `getEntity()` works after creation
