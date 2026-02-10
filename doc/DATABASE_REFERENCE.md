# Database Reference - TPathos

**Database:** `pathwjzs_tpathos`  
**SQL to list all tables:**
```sql
SHOW TABLES;
-- or
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'pathwjzs_tpathos';
```

## Tables

### `entity`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT, NOT NULL, INDEXED
- `ancestor_id` INT(11) NULL, INDEXED
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `login`
- `id` VARCHAR(255) PK
- `entity_id` INT(11) NOT NULL, INDEXED
- `password` TEXT NOT NULL
- `secret` TEXT NULL
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `secret`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT NOT NULL, INDEXED
- `owner_id` INT(11) NOT NULL, INDEXED
- `owner_type_id` INT(11) NOT NULL, INDEXED
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP
- `used_at` TIMESTAMP

### `label`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT NOT NULL, INDEXED
- `ancestor_id` INT(11) NULL, INDEXED
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `property`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT NOT NULL, INDEXED
- `owner_id` INT(11) NOT NULL, INDEXED
- `owner_type_id` INT(11) NOT NULL, INDEXED
- `property_key` VARCHAR(255) NOT NULL, INDEXED
- `property_value` TEXT NULL
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `organization`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT NOT NULL, INDEXED
- `ancestor_id` INT(11) NULL, INDEXED
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `post`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT NOT NULL, INDEXED
- `ancestor_id` INT(11) NULL, INDEXED
- `owner_id` INT(11) NOT NULL, INDEXED
- `owner_type_id` INT(11) NOT NULL, INDEXED
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `tevent`
- `id` INT(11) PK, AUTO_INCREMENT
- `path` TEXT NOT NULL, INDEXED
- `start_timestamp` TIMESTAMP NULL
- `start_moment` TEXT NOT NULL
- `finish_timestamp` TIMESTAMP NULL
- `finish_moment` TEXT NOT NULL
- `ancestor_id` INT(11) NULL, INDEXED
- `owner_id` INT(11) NOT NULL, INDEXED
- `owner_type_id` INT(11) NOT NULL, INDEXED
- `created_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `owner_type`
- `id` INT(11) PK, AUTO_INCREMENT
- `type_name` VARCHAR(50) NOT NULL, UNIQUE
- `created_at` TIMESTAMP
- **Values:** 'entity' (1), 'organization' (2), 'post' (3), 'tevent' (4)

### `log_type`
- `id` INT(11) PK, AUTO_INCREMENT
- `type_name` VARCHAR(50) NOT NULL, UNIQUE
- `created_at` TIMESTAMP
- **Values:** 'system' (1), 'user_action' (2), 'api_call' (3), 'error' (4), 'security' (5), 'audit' (6)

### `action_type`
- `id` INT(11) PK, AUTO_INCREMENT
- `type_name` VARCHAR(50) NOT NULL, UNIQUE
- `created_at` TIMESTAMP
- **Values:** 'create' (1), 'read' (2), 'update' (3), 'delete' (4), 'login' (5), 'logout' (6), 'register' (7), 'view' (8)

### `tlog`
- `id` INT(11) PK, AUTO_INCREMENT
- `owner_id` INT(11) NULL, INDEXED → `entity.id`
- `log_type_id` INT(11) NOT NULL, INDEXED → `log_type.id`
- `action_type_id` INT(11) NOT NULL, INDEXED → `action_type.id`
- `start_timestamp` TIMESTAMP NULL
- `start_moment` TEXT NOT NULL
- `finish_timestamp` TIMESTAMP NULL
- `finish_moment` TEXT NOT NULL
- `receiver_id` INT(11) NULL, INDEXED → `entity.id`
- `path_id` TEXT NULL
- `metadata` TEXT NULL
- `created_at` TIMESTAMP INDEXED

## Junction Tables

### `entity_label`
- `entity_id` INT(11) PK, INDEXED
- `label_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `entity_property`
- `entity_id` INT(11) PK, INDEXED
- `property_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `organization_entity`
- `organization_id` INT(11) PK, INDEXED
- `entity_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `organization_label`
- `organization_id` INT(11) PK, INDEXED
- `label_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `organization_property`
- `organization_id` INT(11) PK, INDEXED
- `property_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `post_label`
- `post_id` INT(11) PK, INDEXED
- `label_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `post_property`
- `post_id` INT(11) PK, INDEXED
- `property_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `tevent_label`
- `tevent_id` INT(11) PK, INDEXED
- `label_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

### `tevent_property`
- `tevent_id` INT(11) PK, INDEXED
- `property_id` INT(11) PK, INDEXED
- `created_at` TIMESTAMP

## Notes

- **PK** = Primary Key
- **INDEXED** = Has an index for faster queries
- **Polymorphic relationships:** `property`, `post`, `tevent` use `owner_id` + `owner_type_id` to reference different tables
- **Hierarchical structure:** `entity`, `label`, `organization`, `post`, `tevent` use `ancestor_id` for parent-child relationships
- **Triggers:** `tr_post_owner_check`, `tr_property_owner_check`, `tr_tevent_owner_check` validate owner references
- **Logging system:** `tlog` tracks actions with temporal information, linked to `log_type` and `action_type` lookup tables
- **Temporal logs:** `tlog` uses `start_moment` and `finish_moment` for PathChain integration alongside Unix timestamps
