const { Entity, Login, Secret, OwnerType } = require('../models');
const pathchainUtil = require('../utils/pathchain');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { generateToken } = require('../utils/jwt');

/**
 * Authentication Service
 * Handles user registration, login, and entity management
 * Bridges PathChain file-based storage with database records
 */

/**
 * Error codes for authentication operations
 */
const ErrorCodes = {
  INVALID_SECRET: 40100,
  USED_SECRET: 40101,
  INVALID_REQUEST: 40102,
  INVALID_CREDENTIALS: 40103,
  INVALID_TOKEN: 40104,
  ANCESTOR_NOT_FOUND: 40105,
  USERNAME_EXISTS: 40106,
  PIONEER_CREATION_FAILED: 50001,
  PIONEER_SECRET_NOT_FOUND: 50002,
  ENTITY_RETRIEVAL_FAILED: 50003,
  PIONEER_RETRIEVAL_FAILED: 50004,
  DATABASE_ERROR: 50005
};

/**
 * Initialize the system by creating the pioneer if it doesn't exist
 * Pioneer is the root entity that all other entities descend from
 * @returns {Object} - { pioneer: Entity, secret: Secret, isNew: boolean }
 */
const initializeSystem = async () => {
  try {
    // Check if pioneer exists in database
    let pioneer = await Entity.findPioneer();
    
    if (pioneer) {
      console.log('System already initialized. Pioneer exists:', pioneer.path);
      // Try to find the actual secret hash even if system is already initialized
      const pioneerHash = pioneer.path.split('/').pop();
      let actualSecretHash = null;
      
      try {
        const fs = require('fs');
        const path = require('path');
        const filesDir = path.join(__dirname, '..', 'files');
        const pioneerSecretsDir = path.join(filesDir, pioneerHash, 'secrets');
        
        if (fs.existsSync(pioneerSecretsDir)) {
          const secretFiles = fs.readdirSync(pioneerSecretsDir);
          if (secretFiles.length > 0) {
            actualSecretHash = secretFiles[0];
          }
        }
      } catch (err) {
        console.warn('Could not find secret hash for existing pioneer:', err.message);
      }
      
      return { pioneer, secret: null, isNew: false, secretHash: actualSecretHash };
    }

    console.log('Initializing system - creating pioneer...');

    // Create pioneer in PathChain
    const pioneerHash = pathchainUtil.createPioneer();
    
    if (!pioneerHash || typeof pioneerHash === 'string' && pioneerHash.includes('error')) {
      throw new Error(`Failed to create pioneer in PathChain: ${pioneerHash}`);
    }

    // Get pioneer object from PathChain
    const pioneerObj = pathchainUtil.getPioneer(pioneerHash);
    
    if (!pioneerObj || typeof pioneerObj === 'string') {
      throw new Error(`Failed to retrieve pioneer from PathChain: ${pioneerObj}`);
    }

    // Save pioneer to database
    // Pioneer is self-referential - ancestor_id is null for the root
    pioneer = await Entity.create({
      path: pioneerObj.tag, // e.g., "entities/{hash}"
      ancestor_id: null
    });

    console.log('Pioneer created in database:', pioneer.id, pioneer.path);

    // Pioneer's secret is created automatically by PathChain when makePioneer() is called
    // According to PATHCHAIN_SCHEMA.md, the secret is created automatically
    // The secret is stored in {pioneer}/secrets/{hash} and also in secrets/{hash}
    // We need to find the actual secret hash by reading the filesystem or using PathChain
    
    let actualSecretHash = null;
    let secretObj = null;
    
    // Try to find the secret that was created for the pioneer
    // The secret should be in the pioneer's secrets directory
    try {
      // Method 1: Try to get secret using the pioneer hash as author
      // PathChain stores secrets in {author}/secrets/{hash}
      const fs = require('fs');
      const path = require('path');
      const filesDir = path.join(__dirname, '..', 'files');
      const pioneerSecretsDir = path.join(filesDir, pioneerHash, 'secrets');
      
      if (fs.existsSync(pioneerSecretsDir)) {
        // Read the secret file from the pioneer's secrets directory
        const secretFiles = fs.readdirSync(pioneerSecretsDir);
        if (secretFiles.length > 0) {
          // The filename is the secret hash
          actualSecretHash = secretFiles[0];
          console.log('Found pioneer secret in filesystem:', actualSecretHash);
          
          // Verify it exists in global secrets too
          const globalSecretPath = path.join(filesDir, 'secrets', actualSecretHash);
          if (fs.existsSync(globalSecretPath)) {
            console.log('Secret also exists in global secrets directory');
          }
          
          // Try to get the secret object from PathChain
          try {
            secretObj = pathchainUtil.getSecret(actualSecretHash, `entities/${pioneerHash}`);
            if (!secretObj || typeof secretObj === 'string') {
              // Try without author path
              secretObj = pathchainUtil.getSecret(actualSecretHash);
            }
          } catch (err) {
            console.warn('Could not retrieve secret object from PathChain:', err.message);
          }
        }
      }
      
      // Method 2: If not found, try using pioneer hash as secret hash (fallback)
      if (!actualSecretHash) {
        console.warn('Secret not found in filesystem, trying pioneer hash as secret');
        actualSecretHash = pioneerHash;
        try {
          secretObj = pathchainUtil.getSecret(pioneerHash);
        } catch (err) {
          console.warn('Could not retrieve secret using pioneer hash:', err.message);
        }
      }
    } catch (err) {
      console.error('Error finding pioneer secret:', err.message);
      // Fallback: use pioneer hash as secret hash
      actualSecretHash = pioneerHash;
    }
    
    // Create secret record in database for tracking
    const secretPath = `secrets/${actualSecretHash}`;
    
    let secret;
    try {
      // Check if secret already exists
      secret = await Secret.findByPath(secretPath);
      
      if (!secret) {
        secret = await Secret.create({
      path: secretPath,
      owner_id: pioneer.id,
      owner_type_id: OwnerType.ENTITY,
      used_at: null
    });
    console.log('Pioneer secret recorded:', secret.id, secret.path);
      } else {
        console.log('Pioneer secret already exists in database:', secret.id);
      }
    } catch (secretErr) {
      console.error('Error creating/retrieving pioneer secret record:', secretErr.message);
      // Don't fail initialization if secret record creation fails
      secret = null;
    }

    console.log('\n========================================');
    console.log('PIONEER SECRET (save this!):', actualSecretHash);
    console.log('You can use this secret to register new users.');
    console.log('Format: secrets/' + actualSecretHash + ' or just ' + actualSecretHash);
    console.log('========================================\n');

    return { pioneer, secret, isNew: true, secretHash: actualSecretHash };
  } catch (error) {
    console.error('System initialization error:', error);
    throw error;
  }
};

/**
 * Register a new user using a secret
 * @param {Object} params - Registration parameters
 * @param {string} params.secret - PathChain secret hash
 * @param {string} params.id - Username (max 255 chars)
 * @param {string} params.password - Plain text password
 * @returns {Object} - { success, token, entity, error }
 */
const register = async ({ secret: secretHash, id: username, password }) => {
  try {
    // Validate input
    if (!username || username.length > 255) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Username is required and must be max 255 characters' }
      };
    }

    if (!password) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Password is required' }
      };
    }

    // Check if username already exists
    if (await Login.usernameExists(username)) {
      return {
        success: false,
        error: { code: ErrorCodes.USERNAME_EXISTS, message: 'Username already exists' }
      };
    }

    let entity;
    let ancestorEntity;

    // If no secret provided, check if we need to create pioneer
    if (!secretHash) {
      // Check if pioneer exists
      const pioneer = await Entity.findPioneer();
      
      if (pioneer) {
        return {
          success: false,
          error: { code: ErrorCodes.INVALID_SECRET, message: 'Secret is required for registration' }
        };
      }

      // Initialize system (creates pioneer)
      const { pioneer: newPioneer, secret: pioneerSecret, isNew } = await initializeSystem();
      
      if (!isNew) {
        return {
          success: false,
          error: { code: ErrorCodes.INVALID_SECRET, message: 'Secret is required for registration' }
        };
      }

      // The first user becomes associated with the pioneer
      entity = newPioneer;
      ancestorEntity = newPioneer;
      
      // Mark pioneer secret as used
      if (pioneerSecret) {
        await pioneerSecret.markAsUsed();
      }
    } else {
      // Normalize secret input (handle both "secrets/hash" and "hash" formats)
      const normalizedSecretHash = pathchainUtil.normalizeSecretHash(secretHash);
      
      if (!normalizedSecretHash) {
        return {
          success: false,
          error: { code: ErrorCodes.INVALID_SECRET, message: 'Invalid secret format' }
        };
      }

      // Validate secret in PathChain
      if (pathchainUtil.isAvailable()) {
        let isUsed;
        try {
          isUsed = pathchainUtil.isSecretUsed(normalizedSecretHash);
        } catch (err) {
          console.error('Error checking if secret is used during registration:', err);
          isUsed = false; // Assume not used if check fails
        }
        
        // If isUsed is a string, it's an error message
        if (typeof isUsed === 'string') {
          console.warn('isSecretUsed returned error during registration:', isUsed);
          // Continue to try getting the secret object
        } else if (isUsed === true) {
          return {
            success: false,
            error: { code: ErrorCodes.USED_SECRET, message: 'Secret has already been used' }
          };
        }

        // Get secret details - try multiple methods
        let secretObj = null;
        try {
          secretObj = pathchainUtil.getSecret(normalizedSecretHash);
          
          // If that fails, try with empty author
          if (typeof secretObj === 'string') {
            try {
              secretObj = pathchainUtil.getSecret(normalizedSecretHash, '');
            } catch (err) {
              console.error('Error getting secret with empty author:', err);
            }
          }
          
          // If still not found, try getObject
          if (!secretObj || typeof secretObj === 'string') {
            try {
              secretObj = pathchainUtil.getObject(`secrets/${normalizedSecretHash}`);
            } catch (err) {
              console.error('Error getting secret via getObject:', err);
            }
          }
        } catch (err) {
          console.error('Error getting secret object during registration:', err);
        }
        
        if (!secretObj || typeof secretObj === 'string') {
          const errorMsg = typeof secretObj === 'string' ? secretObj : 'Secret not found in PathChain';
          console.error('Secret validation failed during registration:', {
            secretHash: normalizedSecretHash,
            error: errorMsg
          });
          return {
            success: false,
            error: { code: ErrorCodes.INVALID_SECRET, message: `Invalid secret: ${errorMsg}` }
          };
        }

        // Find ancestor entity in database by PathChain path
        ancestorEntity = await Entity.findOne({
          where: { path: secretObj.author }
        });

        if (!ancestorEntity) {
          return {
            success: false,
            error: { code: ErrorCodes.ANCESTOR_NOT_FOUND, message: 'Ancestor entity not found in database' }
          };
        }

        // Create entity in PathChain using normalized hash
        // This creates a new entity in PathChain and marks the secret as used
        // PathChain returns a string: either the entity hash (64-char hex) or an error message
        let entityHash;
        try {
          entityHash = pathchainUtil.createEntity(normalizedSecretHash);
        } catch (err) {
          console.error('Error creating entity in PathChain:', err);
          entityHash = `error: ${err.message}`;
        }
        
        // Validate entity hash result
        // PathChain returns a string for both success (hash) and errors (error message)
        // A valid hash is 64 characters of hexadecimal (SHA-256)
        if (!entityHash) {
          return {
            success: false,
            error: { 
              code: ErrorCodes.ENTITY_RETRIEVAL_FAILED, 
              message: 'Failed to create entity in PathChain: No result returned' 
            }
          };
        }
        
        // Check if result is an error message (not a valid hash)
        // Valid hash: 64 hex characters, no spaces, no error keywords
        const isValidHash = /^[a-f0-9]{64}$/i.test(entityHash.trim());
        const isErrorMessage = typeof entityHash === 'string' && (
          entityHash.includes('error') ||
          entityHash.includes('used') ||
          entityHash.includes('already') ||
          entityHash.includes('not found') ||
          entityHash.includes('not identified') ||
          entityHash.includes('Updater') ||
          entityHash.length !== 64 ||
          !isValidHash
        );
        
        if (isErrorMessage) {
          const errorMsg = entityHash;
          
          // Check if secret was already used
          if (errorMsg.includes('used') || errorMsg.includes('already')) {
            // Double-check with PathChain
            const isUsedCheck = pathchainUtil.isSecretUsed(normalizedSecretHash);
            if (isUsedCheck === true) {
              return {
                success: false,
                error: { code: ErrorCodes.USED_SECRET, message: 'Secret has already been used' }
              };
            }
          }
          
          // Check for "Updater not identified" or similar PathChain errors
          if (errorMsg.includes('Updater') || errorMsg.includes('not identified') || errorMsg.includes('not found')) {
            return {
              success: false,
              error: { 
                code: ErrorCodes.INVALID_SECRET, 
                message: `Invalid secret: ${errorMsg}. The secret may have already been used or does not exist.` 
              }
            };
          }
          
          return {
            success: false,
            error: { 
              code: ErrorCodes.ENTITY_RETRIEVAL_FAILED, 
              message: `Failed to create entity in PathChain: ${errorMsg}` 
            }
          };
        }
        
        // entityHash is a valid hash - verify we can retrieve the entity object
        console.log('✅ Entity created in PathChain, hash:', entityHash);

        // Get entity object to verify it was created successfully
        // Try multiple methods to retrieve the entity
        let entityObj = null;
        try {
          // First try: get entity without author path
          entityObj = pathchainUtil.getEntity(entityHash);
          
          // If that returns an error string, try with author path
          if (typeof entityObj === 'string') {
            console.log('⚠️  First attempt failed, trying with author path...');
            try {
              // Try with the ancestor's path as author
              const authorPath = secretObj.author; // e.g., "entities/{pioneerHash}"
              entityObj = pathchainUtil.getEntity(entityHash, authorPath);
              console.log('✅ Retrieved entity with author path:', authorPath);
            } catch (err) {
              console.error('❌ Error getting entity with author path:', err);
            }
          }
          
          // If still not found, try getObject
          if (!entityObj || typeof entityObj === 'string') {
            console.log('⚠️  Trying getObject method...');
            try {
              entityObj = pathchainUtil.getObject(`entities/${entityHash}`);
              console.log('✅ Retrieved entity via getObject');
            } catch (err) {
              console.error('❌ Error getting entity via getObject:', err);
            }
          }
        } catch (err) {
          console.error('❌ Error retrieving entity object:', err);
        }
        
        if (!entityObj || typeof entityObj === 'string') {
          const errorMsg = typeof entityObj === 'string' ? entityObj : 'Entity not found in PathChain';
          console.error('❌ Failed to retrieve entity object:', {
            entityHash,
            error: errorMsg,
            secretAuthor: secretObj.author
          });
          return {
            success: false,
            error: { 
              code: ErrorCodes.ENTITY_RETRIEVAL_FAILED, 
              message: `Failed to retrieve entity from PathChain: ${errorMsg}. Entity hash: ${entityHash}` 
            }
          };
        }

        console.log('✅ Entity object retrieved successfully:', {
          tag: entityObj.tag,
          ancestor: entityObj.ancestor,
          register: entityObj.register
        });

        // Use database transaction to ensure atomicity
        // All database operations must succeed or all will be rolled back
        const { sequelize } = require('../config/database');
        const transaction = await sequelize.transaction();
        
        try {
          // Save entity to database with proper ancestor relationship
          // This maintains referential integrity - ancestor_id must reference a valid entity
          // Foreign key constraint ensures ancestorEntity.id exists in entity table
        entity = await Entity.create({
          path: entityObj.tag,
            ancestor_id: ancestorEntity.id  // Foreign key to parent entity
          }, { transaction });

          console.log('Entity created in database:', {
            id: entity.id,
            path: entity.path,
            ancestor_id: entity.ancestor_id
        });

          // Update secret in database (store as "secrets/hash" format)
          // This maintains the relationship between secrets and entities
          const secretPath = `secrets/${normalizedSecretHash}`;
          let dbSecret = await Secret.findOne({
            where: { path: secretPath },
            transaction
          });
          
        if (dbSecret) {
            // Update existing secret record
            dbSecret.used_at = new Date();
            await dbSecret.save({ transaction });
            console.log('Secret marked as used in database:', dbSecret.id);
        } else {
          // Create secret record if it doesn't exist
            // owner_id references the ancestor entity that created this secret (foreign key)
            // owner_type_id references owner_type table (1 = entity) (foreign key)
            dbSecret = await Secret.create({
              path: secretPath,
              owner_id: ancestorEntity.id,  // Foreign key to entity table
              owner_type_id: OwnerType.ENTITY,  // Foreign key to owner_type table
            used_at: new Date()
            }, { transaction });
            console.log('Secret record created in database:', dbSecret.id);
        }

          // Create login record - THIS IS CRITICAL FOR SESSION PERSISTENCE
          // Without this, token verification will fail on page refresh
          const hashedPassword = hashPassword(password);
          await Login.create({
            id: username,
            entity_id: entity.id,  // Foreign key to entity table
            password: hashedPassword,
            secret: normalizedSecretHash || null
          }, { transaction });
          console.log('Login record created in database for user:', username);

          // Commit transaction - all database operations succeeded
          await transaction.commit();
          console.log('Database transaction committed successfully - Entity, Secret, and Login created');

          // Mark secret as used in PathChain (this updates the PathChain file)
          // This is done AFTER database commit to ensure database integrity first
          try {
            pathchainUtil.useSecret(normalizedSecretHash);
            console.log('Secret marked as used in PathChain');
          } catch (err) {
            console.warn('Warning: Could not mark secret as used in PathChain:', err.message);
            // Don't fail registration if PathChain update fails - database is source of truth
          }
        } catch (dbError) {
          // Rollback transaction on any error
          await transaction.rollback();
          console.error('Database transaction rolled back due to error:', dbError);
          throw dbError;
        }
      } else {
        // PathChain not available - create entity directly in database
        // Find any existing entity to use as ancestor (fallback)
        ancestorEntity = await Entity.findPioneer();
        
        if (!ancestorEntity) {
          // Create pioneer entity
          const { pioneer } = await initializeSystem();
          ancestorEntity = pioneer;
        }

        // Use database transaction for PathChain-unavailable case too
        const { sequelize } = require('../config/database');
        const transaction = await sequelize.transaction();
        
        try {
          // Create entity
        entity = await Entity.create({
            path: `entities/${normalizedSecretHash}`, // Use normalized secret as entity identifier
            ancestor_id: ancestorEntity.id  // Foreign key to parent entity
          }, { transaction });

          // Create secret record
          const secretPath = `secrets/${normalizedSecretHash}`;
          await Secret.create({
            path: secretPath,
            owner_id: ancestorEntity.id,  // Foreign key to entity table
            owner_type_id: OwnerType.ENTITY,  // Foreign key to owner_type table
            used_at: new Date()
          }, { transaction });

          // Create login record
    const hashedPassword = hashPassword(password);
          const storedSecretHash = pathchainUtil.normalizeSecretHash(secretHash);
    
    await Login.create({
      id: username,
            entity_id: entity.id,  // Foreign key to entity table
      password: hashedPassword,
            secret: storedSecretHash || null
          }, { transaction });

          await transaction.commit();
          console.log('Registration completed (PathChain unavailable) - all records created');
        } catch (dbError) {
          await transaction.rollback();
          throw dbError;
        }
      }
    }

    // Note: For PathChain-available case, login record is created within the transaction above
    // This ensures atomicity - if login creation fails, entity and secret are also rolled back

    // Generate JWT token
    const token = generateToken({
      entityId: entity.id,
      username: username,
      path: entity.path
    });

    return {
      success: true,
      token,
      entity: {
        id: entity.id,
        path: entity.path,
        username: username
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: { code: ErrorCodes.DATABASE_ERROR, message: error.message }
    };
  }
};

/**
 * Login with username and password
 * @param {Object} params - Login parameters
 * @param {string} params.username - Username
 * @param {string} params.password - Plain text password
 * @returns {Object} - { success, token, entity, error }
 */
const login = async ({ username, password }) => {
  try {
    // Validate input
    if (!username || !password) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Username and password are required' }
      };
    }

    // Find login record
    const loginRecord = await Login.findByUsername(username);
    
    if (!loginRecord) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid username or password' }
      };
    }

    // Verify password
    if (!verifyPassword(password, loginRecord.password)) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid username or password' }
      };
    }

    // Get entity
    const entity = await Entity.findByPk(loginRecord.entity_id);
    
    if (!entity) {
      return {
        success: false,
        error: { code: ErrorCodes.DATABASE_ERROR, message: 'Entity not found' }
      };
    }

    // Generate JWT token
    const token = generateToken({
      entityId: entity.id,
      username: username,
      path: entity.path
    });

    return {
      success: true,
      token,
      entity: {
        id: entity.id,
        path: entity.path,
        username: username
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: { code: ErrorCodes.DATABASE_ERROR, message: error.message }
    };
  }
};

/**
 * Login with secret (alternative authentication method)
 * @param {Object} params - Secret login parameters
 * @param {string} params.secret - Secret string
 * @returns {Object} - { success, token, entity, error }
 */
const loginWithSecret = async ({ secret }) => {
  try {
    if (!secret) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Secret is required' }
      };
    }

    // Normalize secret input (handle both "secrets/hash" and "hash" formats)
    const normalizedSecret = pathchainUtil.normalizeSecretHash(secret);

    // Find login record by secret (try both normalized and original formats)
    let loginRecord = await Login.findOne({
      where: { secret: normalizedSecret }
    });

    // Also try original format if different
    if (!loginRecord && normalizedSecret !== secret) {
      loginRecord = await Login.findOne({
      where: { secret }
    });
    }

    if (!loginRecord) {
      // Secret might be a PathChain secret - try to find associated entity
      if (pathchainUtil.isAvailable()) {
        const secretObj = pathchainUtil.getSecret(normalizedSecret);
        
        if (secretObj && typeof secretObj !== 'string') {
          // Find entity by secret's user field (if used)
          if (secretObj.used && secretObj.user) {
            const entity = await Entity.findOne({
              where: { path: secretObj.user }
            });

            if (entity) {
              // Find any login for this entity
              const entityLogin = await Login.findOne({
                where: { entity_id: entity.id }
              });

              if (entityLogin) {
                const token = generateToken({
                  entityId: entity.id,
                  username: entityLogin.id,
                  path: entity.path
                });

                return {
                  success: true,
                  token,
                  entity: {
                    id: entity.id,
                    path: entity.path,
                    username: entityLogin.id
                  }
                };
              }
            }
          }
        }
      }

      return {
        success: false,
        error: { code: ErrorCodes.INVALID_SECRET, message: 'Invalid secret' }
      };
    }

    // Get entity
    const entity = await Entity.findByPk(loginRecord.entity_id);
    
    if (!entity) {
      return {
        success: false,
        error: { code: ErrorCodes.DATABASE_ERROR, message: 'Entity not found' }
      };
    }

    // Generate JWT token
    const token = generateToken({
      entityId: entity.id,
      username: loginRecord.id,
      path: entity.path
    });

    return {
      success: true,
      token,
      entity: {
        id: entity.id,
        path: entity.path,
        username: loginRecord.id
      }
    };
  } catch (error) {
    console.error('Secret login error:', error);
    return {
      success: false,
      error: { code: ErrorCodes.DATABASE_ERROR, message: error.message }
    };
  }
};

/**
 * Check if a secret is valid and unused
 * @param {string} secretInput - Secret input (can be "secrets/hash" or just "hash")
 * @returns {Object} - { valid, unused, error }
 */
const checkSecret = async (secretInput) => {
  try {
    if (!secretInput) {
      return {
        valid: false,
        unused: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Secret is required' }
      };
    }

    // Normalize secret input (handle both "secrets/hash" and "hash" formats)
    const secretHash = pathchainUtil.normalizeSecretHash(secretInput);

    if (!secretHash) {
      return {
        valid: false,
        unused: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Invalid secret format' }
      };
    }

    // Check if PathChain is available
    if (!pathchainUtil.isAvailable()) {
      return {
        valid: false,
        unused: false,
        error: { code: ErrorCodes.DATABASE_ERROR, message: 'PathChain not available' }
      };
    }

    // Check if secret exists and is used in PathChain
    let isUsed;
    try {
      isUsed = pathchainUtil.isSecretUsed(secretHash);
    } catch (err) {
      console.error('Error checking if secret is used:', err);
      // If isSecretUsed throws, the secret might not exist
      isUsed = 'error';
    }
    
    // If isSecretUsed returns a string, it's an error message
    if (typeof isUsed === 'string') {
      console.log('isSecretUsed returned error:', isUsed);
      // Try to get the secret object anyway - it might exist but check failed
    } else if (isUsed === true) {
      return {
        valid: true,
        unused: false,
        error: null
      };
    }

    // Get secret object to verify it exists
    // Try multiple paths: global secrets/ and author-specific paths
    let secretObj = null;
    let secretError = null;
    
    try {
      // First try: get secret without author (global secrets/)
      secretObj = pathchainUtil.getSecret(secretHash);
      
      // If that returns an error string, try with empty author path explicitly
      if (typeof secretObj === 'string') {
        secretError = secretObj;
        secretObj = null;
        
        // Try with empty author path
        try {
          secretObj = pathchainUtil.getSecret(secretHash, '');
        } catch (err) {
          console.error('Error getting secret with empty author:', err);
        }
      }
      
      // If still not found, try to get it using the full path
      if (!secretObj || typeof secretObj === 'string') {
        // Try using getObject with the full path
        try {
          const fullPath = `secrets/${secretHash}`;
          secretObj = pathchainUtil.getObject(fullPath);
        } catch (err) {
          console.error('Error getting secret via getObject:', err);
        }
      }
    } catch (err) {
      console.error('Error getting secret object:', err);
      secretError = err.message;
      secretObj = null;
    }
    
    // If secretObj is still a string or null, it's an error
    if (!secretObj || typeof secretObj === 'string') {
      const errorMsg = typeof secretObj === 'string' ? secretObj : (secretError || 'Secret not found in PathChain');
      console.error('Secret validation failed:', {
        secretHash,
        isUsed,
        secretObjError: errorMsg,
        secretObjType: typeof secretObj
      });
      return {
        valid: false,
        unused: false,
        error: { 
          code: ErrorCodes.INVALID_SECRET, 
          message: `Invalid secret: ${errorMsg}` 
        }
      };
    }

    // Secret exists and is valid
    console.log('Secret validated successfully:', {
      secretHash,
      tag: secretObj.tag,
      used: secretObj.used,
      author: secretObj.author
    });

    return {
      valid: true,
      unused: !secretObj.used,
      error: null
    };
  } catch (error) {
    console.error('Secret check error:', error);
    return {
      valid: false,
      unused: false,
      error: { code: ErrorCodes.DATABASE_ERROR, message: error.message }
    };
  }
};

/**
 * Fetch entity + login info from DB for a given entity ID
 * @param {number} entityId - Entity ID
 * @returns {Object} - { success, entity, login, error }
 */
const fetchEntityInfo = async (entityId) => {
  try {
    if (!entityId) {
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Entity ID is required' }
      };
    }

    const entity = await Entity.findByPk(entityId);
    if (!entity) {
      return {
        success: false,
        error: { code: ErrorCodes.DATABASE_ERROR, message: 'Entity not found' }
      };
    }

    const login = await Login.findOne({
      where: { entity_id: entityId }
    });

    return {
      success: true,
      entity: {
        id: entity.id,
        path: entity.path,
        ancestor_id: entity.ancestor_id,
        created_at: entity.created_at,
        updated_at: entity.updated_at
      },
      login: login ? {
        id: login.id,
        entity_id: login.entity_id,
        created_at: login.created_at,
        updated_at: login.updated_at
        // Don't include password or secret
      } : null
    };
  } catch (error) {
    console.error('Fetch entity info error:', error);
    return {
      success: false,
      error: { code: ErrorCodes.DATABASE_ERROR, message: error.message }
    };
  }
};

/**
 * Get user/entity information by entity ID
 * @param {number} entityId - Entity ID
 * @returns {Object} - { success, entity, login, error }
 */
const getUserInfo = async (entityId) => {
  return fetchEntityInfo(entityId);
};

/**
 * Get ancestor entity information for a given entity ID
 * @param {number} entityId - Entity ID
 * @returns {Object} - { success, entity, login, error }
 */
const getAncestorInfo = async (entityId) => {
  try {
    console.log('>>> Ancestor retrieval:: services/authService.js - start', { entityId });
    if (!entityId) {
      console.log('>>> Ancestor retrieval:: services/authService.js - missing entityId');
      return {
        success: false,
        error: { code: ErrorCodes.INVALID_REQUEST, message: 'Entity ID is required' }
      };
    }

    // Get current entity
    const entity = await Entity.findByPk(entityId);
    console.log('>>> Ancestor retrieval:: services/authService.js - current entity lookup', { entityId, found: !!entity });

    if (!entity) {
      return {
        success: false,
        error: { code: ErrorCodes.DATABASE_ERROR, message: 'Entity not found' }
      };
    }

    // Try to resolve ancestor entity from database first
    let ancestorEntity = null;
    if (entity.ancestor_id) {
      ancestorEntity = await Entity.findByPk(entity.ancestor_id);
      console.log('>>> Ancestor retrieval:: services/authService.js - ancestor_id lookup', { ancestor_id: entity.ancestor_id, found: !!ancestorEntity });
    }

    // Fallback: resolve ancestor from PathChain if DB link is missing
    let ancestorPath = null;
    if (!ancestorEntity) {
      try {
        const currentHash = pathchainUtil.extractHash(entity.path);
        let entityObj = null;

        try {
          entityObj = pathchainUtil.getEntity(currentHash);
          if (typeof entityObj === 'string') {
            entityObj = pathchainUtil.getEntity(currentHash, '');
          }
          if (!entityObj || typeof entityObj === 'string') {
            entityObj = pathchainUtil.getObject(entity.path);
          }
          console.log('>>> Ancestor retrieval:: services/authService.js - pathchain current entity', {
            currentHash,
            hasObject: !!entityObj && typeof entityObj !== 'string'
          });
        } catch (err) {
          console.error('Error getting current entity from PathChain:', err);
        }

        if (entityObj && typeof entityObj !== 'string' && entityObj.ancestor) {
          ancestorPath = entityObj.ancestor;
          console.log('>>> Ancestor retrieval:: services/authService.js - pathchain ancestor path', { ancestorPath });
        }
      } catch (err) {
        console.error('PathChain not available or error resolving ancestor:', err);
      }

      if (ancestorPath) {
        ancestorEntity = await Entity.findOne({ where: { path: ancestorPath } });
        console.log('>>> Ancestor retrieval:: services/authService.js - ancestor path lookup', { ancestorPath, found: !!ancestorEntity });
      }
    }

    if (!ancestorEntity) {
      console.log('>>> Ancestor retrieval:: services/authService.js - ancestor not found');
      return {
        success: false,
        error: { code: ErrorCodes.ANCESTOR_NOT_FOUND, message: 'Ancestor entity not found' }
      };
    }

    // Try to get ancestor entity object from PathChain
    let ancestorObj = null;
    try {
      const pathchainUtil = require('../utils/pathchain');
      
      // Extract hash from path (e.g., "entities/abc123" -> "abc123")
      const ancestorHash = ancestorEntity.path.replace(/^entities\//, '');
      
      // Try to get entity object from PathChain
      try {
        ancestorObj = pathchainUtil.getEntity(ancestorHash);
        
        // If that returns an error string, try with author path
        if (typeof ancestorObj === 'string') {
          // Try with empty author
          ancestorObj = pathchainUtil.getEntity(ancestorHash, '');
        }
        
        // If still not found, try getObject
        if (!ancestorObj || typeof ancestorObj === 'string') {
          ancestorObj = pathchainUtil.getObject(ancestorEntity.path);
        }
      } catch (err) {
        console.error('Error getting ancestor from PathChain:', err);
      }
    } catch (err) {
      console.error('PathChain not available or error:', err);
    }

    const ancestorInfo = await fetchEntityInfo(ancestorEntity.id);
    console.log('>>> Ancestor retrieval:: services/authService.js - ancestor info fetched', {
      ancestorId: ancestorEntity.id,
      success: ancestorInfo.success
    });
    if (!ancestorInfo.success) {
      return ancestorInfo;
    }

    return {
      success: true,
      entity: {
        ...ancestorInfo.entity,
        pathchainData: ancestorObj && typeof ancestorObj !== 'string' ? ancestorObj : null
      },
      login: ancestorInfo.login
    };
  } catch (error) {
    console.log('>>> Ancestor retrieval:: services/authService.js - error', { message: error.message });
    console.error('Get ancestor info error:', error);
    return {
      success: false,
      error: { code: ErrorCodes.DATABASE_ERROR, message: error.message }
    };
  }
};

/**
 * Get current system status
 * @returns {Object} - System status information
 */
const getSystemStatus = async () => {
  try {
    const pioneer = await Entity.findPioneer();
    const entityCount = await Entity.count();
    const loginCount = await Login.count();
    const secretCount = await Secret.count();

    return {
      initialized: !!pioneer,
      pioneer: pioneer ? {
        id: pioneer.id,
        path: pioneer.path
      } : null,
      counts: {
        entities: entityCount,
        logins: loginCount,
        secrets: secretCount
      },
      pathchain: {
        available: pathchainUtil.isAvailable()
      }
    };
  } catch (error) {
    console.error('System status error:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
};

module.exports = {
  ErrorCodes,
  initializeSystem,
  register,
  login,
  loginWithSecret,
  checkSecret,
  fetchEntityInfo,
  getUserInfo,
  getAncestorInfo,
  getSystemStatus
};

