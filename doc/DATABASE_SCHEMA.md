# Database Schema Documentation - TPathos System

## System Overview

This database implements a hierarchical content management and organizational system with polymorphic relationships. The system manages entities (users/individuals), organizations, posts, time-based events (tevents), and their interconnections through labels and properties. The architecture supports multi-level hierarchies via ancestor relationships and flexible ownership through polymorphic associations. Additionally, a comprehensive logging system (tlog) tracks all temporal actions within the system with dual time representation (Unix timestamps and PathChain moments).

## Core Concepts

### Hierarchical Structure
Multiple tables use `path` and `ancestor_id` to create tree structures. The `path` field stores a hierarchical path string, while `ancestor_id` references the parent record in the same table, enabling efficient tree traversal and queries.

### Polymorphic Relationships
Three tables (`property`, `post`, `tevent`) implement polymorphic ownership using `owner_id` and `owner_type_id`. The `owner_type_id` references the `owner_type` lookup table to determine which table the `owner_id` points to. Database triggers enforce referential integrity by validating that the owner exists in the correct table based on the owner type.

### Label and Property System
Labels and properties provide flexible categorization and metadata. Labels are hierarchical and can be attached to entities, organizations, posts, and tevents through junction tables. Properties store key-value pairs with polymorphic ownership and can also be associated through junction tables for many-to-many relationships.

## Table Definitions

### owner_type
**Purpose**: Lookup table defining valid owner types for polymorphic relationships.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `type_name` (VARCHAR(50), UNIQUE): Owner type identifier
- `created_at` (TIMESTAMP): Creation timestamp

**Data Flow**: Pre-populated with four types: 'entity', 'organization', 'post', 'tevent'. Referenced by `property`, `post`, and `tevent` tables via `owner_type_id` to determine which table contains the owner record.

**Relationships**: Referenced by property.owner_type_id, post.owner_type_id, tevent.owner_type_id.

---

### entity
**Purpose**: Represents individual users or entities in the system. Acts as a core identity that can own posts, tevents, and properties.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `ancestor_id` (INT, NULLABLE, INDEXED): Foreign key to entity.id for parent entity
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**: 
- Created independently or as child of another entity (via ancestor_id)
- Can be associated with organizations through organization_entity junction table
- Can own posts (owner_type_id=1) and tevents (owner_type_id=1)
- Can have properties owned directly (owner_type_id=1) or associated via entity_property junction table
- Can have labels via entity_label junction table
- Linked to login credentials via login.entity_id

**Relationships**:
- Self-referential: entity.ancestor_id -> entity.id
- One-to-many: entity.id -> login.entity_id
- Many-to-many: entity <-> organization (via organization_entity)
- Many-to-many: entity <-> label (via entity_label)
- Many-to-many: entity <-> property (via entity_property)
- Polymorphic owner: entity.id referenced by post.owner_id (when post.owner_type_id=1), tevent.owner_id (when tevent.owner_type_id=1), property.owner_id (when property.owner_type_id=1)

---

### organization
**Purpose**: Represents organizational structures with hierarchical support. Organizations can contain entities and own posts, tevents, and properties.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `ancestor_id` (INT, NULLABLE, INDEXED): Foreign key to organization.id for parent organization
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**:
- Created independently or as child of another organization (via ancestor_id)
- Can contain entities through organization_entity junction table
- Can own posts (owner_type_id=2) and tevents (owner_type_id=2)
- Can have properties owned directly (owner_type_id=2) or associated via organization_property junction table
- Can have labels via organization_label junction table

**Relationships**:
- Self-referential: organization.ancestor_id -> organization.id
- Many-to-many: organization <-> entity (via organization_entity)
- Many-to-many: organization <-> label (via organization_label)
- Many-to-many: organization <-> property (via organization_property)
- Polymorphic owner: organization.id referenced by post.owner_id (when post.owner_type_id=2), tevent.owner_id (when tevent.owner_type_id=2), property.owner_id (when property.owner_type_id=2)

---

### label
**Purpose**: Hierarchical categorization system. Labels can be attached to entities, organizations, posts, and tevents for flexible tagging and organization.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `ancestor_id` (INT, NULLABLE, INDEXED): Foreign key to label.id for parent label
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**:
- Created independently or as child of another label (via ancestor_id)
- Attached to entities via entity_label junction table
- Attached to organizations via organization_label junction table
- Attached to posts via post_label junction table
- Attached to tevents via tevent_label junction table

**Relationships**:
- Self-referential: label.ancestor_id -> label.id
- Many-to-many: label <-> entity (via entity_label)
- Many-to-many: label <-> organization (via organization_label)
- Many-to-many: label <-> post (via post_label)
- Many-to-many: label <-> tevent (via tevent_label)

---

### property
**Purpose**: Stores key-value metadata with polymorphic ownership. Properties can belong to entities, organizations, posts, or tevents. Additionally, properties can be associated with entities and organizations through junction tables for many-to-many relationships.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `owner_id` (INT, NOT NULL, INDEXED): ID of the owner (polymorphic)
- `owner_type_id` (INT, NOT NULL, INDEXED): Foreign key to owner_type.id
- `property_key` (VARCHAR(255), INDEXED): Property name/identifier
- `property_value` (TEXT, NULLABLE): Property value
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**:
- Created with owner_id and owner_type_id to establish ownership
- Database trigger validates owner exists in correct table based on owner_type_id
- Can be directly owned by entity (owner_type_id=1), organization (owner_type_id=2), post (owner_type_id=3), or tevent (owner_type_id=4)
- Can be associated with entities via entity_property junction table (many-to-many)
- Can be associated with organizations via organization_property junction table (many-to-many)

**Polymorphic Relationship**:
- When owner_type_id=1: owner_id references entity.id
- When owner_type_id=2: owner_id references organization.id
- When owner_type_id=3: owner_id references post.id
- When owner_type_id=4: owner_id references tevent.id

**Relationships**:
- Foreign key: property.owner_type_id -> owner_type.id
- Polymorphic: property.owner_id -> entity.id OR organization.id OR post.id OR tevent.id (determined by owner_type_id)
- Many-to-many: property <-> entity (via entity_property)
- Many-to-many: property <-> organization (via organization_property)

**Trigger**: `tr_property_owner_check` validates owner_id exists in the correct table before insert.

---
### post
**Purpose**: Represents posts or content items with hierarchical structure. Posts can be owned by entities or organizations.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `ancestor_id` (INT, NULLABLE, INDEXED): Foreign key to post.id for parent post
- `owner_id` (INT, NOT NULL, INDEXED): ID of the owner (polymorphic)
- `owner_type_id` (INT, NOT NULL, INDEXED): Foreign key to owner_type.id
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**:
- Created with owner_id and owner_type_id (must be entity or organization)
- Database trigger validates owner exists in entity or organization table
- Can be child of another post (via ancestor_id)
- Can have labels via post_label junction table
- Can have properties via post_property junction table
- Can own properties directly (property.owner_type_id=3, property.owner_id=post.id)

**Polymorphic Relationship**:
- When owner_type_id=1: owner_id references entity.id
- When owner_type_id=2: owner_id references organization.id

**Relationships**:
- Self-referential: post.ancestor_id -> post.id
- Foreign key: post.owner_type_id -> owner_type.id
- Polymorphic: post.owner_id -> entity.id OR organization.id (determined by owner_type_id)
- Many-to-many: post <-> label (via post_label)
- Many-to-many: post <-> property (via post_property)
- Polymorphic owner: post.id referenced by property.owner_id (when property.owner_type_id=3)

**Trigger**: `tr_post_owner_check` validates owner_id exists in entity or organization table before insert.

---

### tevent
**Purpose**: Represents time-based events with start and finish times. Events can be owned by entities or organizations and support both timestamp and moment-based time representation.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `start_timestamp` (TIMESTAMP, NULLABLE, INDEXED): Start time as timestamp
- `start_moment` (TEXT, NOT NULL): Start time as text/moment representation
- `finish_timestamp` (TIMESTAMP, NULLABLE, INDEXED): Finish time as timestamp
- `finish_moment` (TEXT, NOT NULL): Finish time as text/moment representation
- `ancestor_id` (INT, NULLABLE, INDEXED): Foreign key to tevent.id for parent event
- `owner_id` (INT, NOT NULL, INDEXED): ID of the owner (polymorphic)
- `owner_type_id` (INT, NOT NULL, INDEXED): Foreign key to owner_type.id
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**:
- Created with owner_id and owner_type_id (must be entity or organization)
- Database trigger validates owner exists in entity or organization table
- Can be child of another tevent (via ancestor_id)
- Can have labels via tevent_label junction table
- Can have properties via tevent_property junction table
- Can own properties directly (property.owner_type_id=4, property.owner_id=tevent.id)
- Supports dual time representation: both timestamp (for queries) and moment text (for flexible time formats)

**Polymorphic Relationship**:
- When owner_type_id=1: owner_id references entity.id
- When owner_type_id=2: owner_id references organization.id

**Relationships**:
- Self-referential: tevent.ancestor_id -> tevent.id
- Foreign key: tevent.owner_type_id -> owner_type.id
- Polymorphic: tevent.owner_id -> entity.id OR organization.id (determined by owner_type_id)
- Many-to-many: tevent <-> label (via tevent_label)
- Many-to-many: tevent <-> property (via tevent_property)
- Polymorphic owner: tevent.id referenced by property.owner_id (when property.owner_type_id=4)

**Trigger**: `tr_tevent_owner_check` validates owner_id exists in entity or organization table before insert.

---

### login
**Purpose**: Stores authentication credentials for entities. Each entity can have login credentials.

**Fields**:
- `id` (VARCHAR(255), PK): Login identifier (username/email)
- `entity_id` (INT, NOT NULL, INDEXED): Foreign key to entity.id
- `password` (TEXT, NOT NULL): Hashed password
- `secret` (TEXT, NULLABLE): Additional secret/token
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Data Flow**:
- Created when entity needs authentication
- Linked to single entity via entity_id
- Password and secret updated for authentication changes

**Relationships**:
- Foreign key: login.entity_id -> entity.id (one-to-many: one entity can have multiple login records)

---

### secret
**Purpose**: Stores secrets with polymorphic ownership. Secrets can belong to entities, organizations, posts, or tevents. The `used_at` timestamp tracks when the secret was last used.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `path` (TEXT, INDEXED): Hierarchical path string
- `owner_id` (INT, NOT NULL, INDEXED): ID of the owner (polymorphic)
- `owner_type_id` (INT, NOT NULL, INDEXED): Foreign key to owner_type.id
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `used_at` (TIMESTAMP): Last usage timestamp (auto-updated on use)

**Data Flow**:
- Created with owner_id and owner_type_id to establish ownership
- Can be directly owned by entity (owner_type_id=1), organization (owner_type_id=2), post (owner_type_id=3), or tevent (owner_type_id=4)
- `used_at` timestamp is automatically updated when the secret is used
- `updated_at` timestamp tracks general updates to the secret record

**Polymorphic Relationship**:
- When owner_type_id=1: owner_id references entity.id
- When owner_type_id=2: owner_id references organization.id
- When owner_type_id=3: owner_id references post.id
- When owner_type_id=4: owner_id references tevent.id

**Relationships**:
- Foreign key: secret.owner_type_id -> owner_type.id
- Polymorphic: secret.owner_id -> entity.id OR organization.id OR post.id OR tevent.id (determined by owner_type_id)

---

### log_type
**Purpose**: Lookup table defining valid log types for the logging system. Categorizes different types of log entries (system logs, user actions, API calls, errors, security events, audits).

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `type_name` (VARCHAR(50), UNIQUE): Log type identifier
- `created_at` (TIMESTAMP): Creation timestamp

**Data Flow**: Pre-populated with standard log types: 'system', 'user_action', 'api_call', 'error', 'security', 'audit'. Referenced by `tlog` table via `log_type_id` to categorize log entries.

**Relationships**: Referenced by tlog.log_type_id.

---

### action_type
**Purpose**: Lookup table defining valid action types for the logging system. Standardizes action names across the application (CRUD operations, authentication actions, etc.).

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `type_name` (VARCHAR(50), UNIQUE): Action type identifier
- `created_at` (TIMESTAMP): Creation timestamp

**Data Flow**: Pre-populated with standard actions: 'create', 'read', 'update', 'delete', 'login', 'logout', 'register', 'view'. Referenced by `tlog` table via `action_type_id` to record what action was performed.

**Relationships**: Referenced by tlog.action_type_id.

---

### tlog
**Purpose**: Main logging table for tracking temporal actions within the system. Records who performed an action, what type of action, when it occurred (dual time representation), and optionally who received the action and what path was involved. Temporal logs (tlog) provide comprehensive audit trails and action history.

**Fields**:
- `id` (INT, PK, AUTO_INCREMENT): Primary key
- `owner_id` (INT, NULLABLE, INDEXED): Foreign key to entity.id (who performed the action)
- `log_type_id` (INT, NOT NULL, INDEXED): Foreign key to log_type.id
- `action_type_id` (INT, NOT NULL, INDEXED): Foreign key to action_type.id
- `start_timestamp` (TIMESTAMP, NULLABLE): When the action started (Unix timestamp)
- `start_moment` (TEXT, NOT NULL): PathChain moment reference for start time
- `finish_timestamp` (TIMESTAMP, NULLABLE): When the action finished (Unix timestamp)
- `finish_moment` (TEXT, NOT NULL): PathChain moment reference for finish time
- `receiver_id` (INT, NULLABLE, INDEXED): Foreign key to entity.id (who received the action)
- `path_id` (TEXT, NULLABLE): Reference to a path within the system (PathChain path or URL)
- `metadata` (TEXT, NULLABLE): Additional metadata as JSON string
- `created_at` (TIMESTAMP, INDEXED): Log entry creation timestamp

**Data Flow**:
- Created when an action occurs in the system
- `owner_id` can be null for system-generated actions (no specific user)
- `receiver_id` is optional and used when the action involves another entity (e.g., entity A messages entity B)
- Both timestamp and moment fields provide dual time representation: timestamps for efficient queries, moments for PathChain integration
- `metadata` can store additional context as JSON (e.g., request details, error messages, IP addresses)
- Indexed on timestamps and created_at for efficient time-range queries
- Foreign keys to log_type and action_type ensure data integrity

**Relationships**:
- Foreign key: tlog.owner_id -> entity.id (nullable, who performed the action)
- Foreign key: tlog.receiver_id -> entity.id (nullable, who received the action)
- Foreign key: tlog.log_type_id -> log_type.id (required)
- Foreign key: tlog.action_type_id -> action_type.id (required)
- One-to-many: entity.id -> tlog.owner_id (entity can perform many actions)
- One-to-many: entity.id -> tlog.receiver_id (entity can receive many actions)

**Use Cases**:
- Audit trail: Track all user actions for security and compliance
- Performance monitoring: Measure action duration using start/finish timestamps
- User activity: Retrieve all actions performed by a specific entity
- Security events: Log authentication attempts, permission changes, data access
- API monitoring: Track API calls, response times, and errors
- System health: Log system-level events and errors
- PathChain integration: Store PathChain moment references for temporal consistency

---

## Junction Tables

### entity_label
**Purpose**: Many-to-many relationship between entities and labels.

**Fields**:
- `entity_id` (INT, PK, FK): References entity.id
- `label_id` (INT, PK, FK): References label.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when label is attached to entity. Composite primary key prevents duplicate associations.

---

### entity_property
**Purpose**: Many-to-many relationship between entities and properties. Allows properties to be associated with entities in addition to direct ownership.

**Fields**:
- `entity_id` (INT, PK, FK): References entity.id
- `property_id` (INT, PK, FK): References property.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when property is associated with entity. Note: properties can also be directly owned by entities via property.owner_id/owner_type_id.

---

### organization_entity
**Purpose**: Many-to-many relationship between organizations and entities. Represents membership or association.

**Fields**:
- `organization_id` (INT, PK, FK): References organization.id
- `entity_id` (INT, PK, FK): References entity.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when entity joins or is assigned to organization. Composite primary key prevents duplicate memberships.

---

### organization_label
**Purpose**: Many-to-many relationship between organizations and labels.

**Fields**:
- `organization_id` (INT, PK, FK): References organization.id
- `label_id` (INT, PK, FK): References label.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when label is attached to organization.

---

### organization_property
**Purpose**: Many-to-many relationship between organizations and properties. Allows properties to be associated with organizations in addition to direct ownership.

**Fields**:
- `organization_id` (INT, PK, FK): References organization.id
- `property_id` (INT, PK, FK): References property.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when property is associated with organization. Note: properties can also be directly owned by organizations via property.owner_id/owner_type_id.

---

### post_label
**Purpose**: Many-to-many relationship between posts and labels.

**Fields**:
- `post_id` (INT, PK, FK): References post.id
- `label_id` (INT, PK, FK): References label.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when label is attached to post.

---

### post_property
**Purpose**: Many-to-many relationship between posts and properties. Allows properties to be associated with posts in addition to direct ownership.

**Fields**:
- `post_id` (INT, PK, FK): References post.id
- `property_id` (INT, PK, FK): References property.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when property is associated with post. Note: properties can also be directly owned by posts via property.owner_id/owner_type_id.

---

### tevent_label
**Purpose**: Many-to-many relationship between tevents and labels.

**Fields**:
- `tevent_id` (INT, PK, FK): References tevent.id
- `label_id` (INT, PK, FK): References label.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when label is attached to tevent.

---

### tevent_property
**Purpose**: Many-to-many relationship between tevents and properties. Allows properties to be associated with tevents in addition to direct ownership.

**Fields**:
- `tevent_id` (INT, PK, FK): References tevent.id
- `property_id` (INT, PK, FK): References property.id
- `created_at` (TIMESTAMP): Association creation timestamp

**Data Flow**: Created when property is associated with tevent. Note: properties can also be directly owned by tevents via property.owner_id/owner_type_id.

---

## Polymorphic Relationship Implementation

### Pattern
Polymorphic relationships use two fields:
1. `owner_id`: The ID of the owning record
2. `owner_type_id`: Foreign key to `owner_type` table indicating which table contains the owner

### Tables Using Polymorphism

**property table**:
- Can be owned by: entity (type_id=1), organization (type_id=2), post (type_id=3), tevent (type_id=4)
- Validation: Trigger `tr_property_owner_check` verifies owner exists in correct table

**post table**:
- Can be owned by: entity (type_id=1), organization (type_id=2)
- Validation: Trigger `tr_post_owner_check` verifies owner exists in entity or organization table

**tevent table**:
- Can be owned by: entity (type_id=1), organization (type_id=2)
- Validation: Trigger `tr_tevent_owner_check` verifies owner exists in entity or organization table

**secret table**:
- Can be owned by: entity (type_id=1), organization (type_id=2), post (type_id=3), tevent (type_id=4)
- Similar to property table, supports polymorphic ownership across all owner types

### Querying Polymorphic Relationships

To query polymorphic relationships:
1. Join with `owner_type` to get type_name
2. Use conditional logic or separate queries based on type_name
3. Join with appropriate table (entity, organization, post, or tevent) based on owner_type_id

Example: To get all properties with their owners:
```sql
SELECT p.*, ot.type_name,
  CASE 
    WHEN ot.type_name = 'entity' THEN e.path
    WHEN ot.type_name = 'organization' THEN o.path
    WHEN ot.type_name = 'post' THEN pt.path
    WHEN ot.type_name = 'tevent' THEN t.path
  END as owner_path
FROM property p
JOIN owner_type ot ON p.owner_type_id = ot.id
LEFT JOIN entity e ON ot.type_name = 'entity' AND p.owner_id = e.id
LEFT JOIN organization o ON ot.type_name = 'organization' AND p.owner_id = o.id
LEFT JOIN post pt ON ot.type_name = 'post' AND p.owner_id = pt.id
LEFT JOIN tevent t ON ot.type_name = 'tevent' AND p.owner_id = t.id
```

## Data Flow Patterns

### Entity Creation Flow
1. Create entity record with path and optional ancestor_id
2. Optionally create login record linked to entity_id
3. Associate entity with organizations via organization_entity
4. Attach labels via entity_label
5. Create or associate properties via property (direct ownership) or entity_property (association)

### Post Creation Flow
1. Determine owner (entity or organization) and get owner_type_id
2. Create post with owner_id, owner_type_id, path, and optional ancestor_id
3. Trigger validates owner exists in correct table
4. Attach labels via post_label
5. Create or associate properties via property (direct ownership) or post_property (association)

### Property Creation Flow
1. Determine owner type and get owner_type_id from owner_type table
2. Create property with owner_id, owner_type_id, property_key, property_value, and path
3. Trigger validates owner exists in correct table based on owner_type_id
4. Optionally associate with entities/organizations via junction tables for many-to-many relationships

### Label Assignment Flow
1. Create or select existing label (hierarchical via ancestor_id)
2. Associate with target via appropriate junction table:
   - entity_label for entities
   - organization_label for organizations
   - post_label for posts
   - tevent_label for tevents

### Organization Membership Flow
1. Create organization (hierarchical via ancestor_id)
2. Associate entities via organization_entity junction table
3. Entities can belong to multiple organizations
4. Organizations can contain multiple entities

## Index Strategy

### Primary Indexes
- All tables have `id` as primary key with AUTO_INCREMENT
- Junction tables use composite primary keys on foreign key pairs

### Foreign Key Indexes
- `ancestor_id` fields indexed for hierarchical queries
- `owner_id` and `owner_type_id` indexed together for polymorphic queries
- `path` fields indexed (first 255 characters) for path-based queries
- `property_key` indexed for property lookups
- Timestamp fields indexed on tevent for time-range queries

### Composite Indexes
- `idx_post_owner` on (owner_id, owner_type_id) for efficient owner queries
- `idx_property_owner` on (owner_id, owner_type_id) for efficient owner queries
- `idx_tevent_owner` on (owner_id, owner_type_id) for efficient owner queries
- `idx_secret_owner` on (owner_id, owner_type_id) for efficient owner queries
- `idx_tevent_timestamps` on (start_timestamp, finish_timestamp) for time-range queries
- `idx_tlog_timestamps` on (start_timestamp, finish_timestamp) for log time-range queries

### Logging System Indexes
- `idx_tlog_owner` on owner_id for efficient log queries by entity
- `idx_tlog_receiver` on receiver_id for efficient log queries by receiver entity
- `idx_tlog_created` on created_at for chronological log retrieval
- `log_type_id` and `action_type_id` indexed for filtering logs by type

## Model Implementation Notes

### Sequelize Considerations

**Polymorphic Associations**:
- Use `belongsTo` with `scope` and `foreignKey` to handle polymorphic relationships
- Implement custom getters/setters to resolve owner based on owner_type_id
- Consider using scopes or separate methods for each owner type

**Hierarchical Relationships**:
- Use `belongsTo` self-referential association for ancestor relationships
- Implement recursive methods for tree traversal
- Consider using closure table pattern or materialized path for efficient queries

**Many-to-Many Relationships**:
- Use `belongsToMany` for junction table relationships
- Define through models for junction tables if additional fields needed

**Validation**:
- Implement application-level validation matching database triggers
- Validate owner_type_id exists in owner_type table
- Validate owner_id exists in correct table based on owner_type_id

### API Design Considerations

**Polymorphic Endpoints**:
- Design endpoints that accept owner_type and owner_id parameters
- Return owner information resolved based on owner_type_id
- Validate owner exists before creating dependent records

**Hierarchical Queries**:
- Provide endpoints for tree traversal (children, ancestors, descendants)
- Support path-based queries
- Implement pagination for large hierarchies

**Label and Property Management**:
- Support both direct ownership and junction table associations
- Provide endpoints for bulk label/property assignment
- Support hierarchical label queries

