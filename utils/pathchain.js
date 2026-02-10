/**
 * PathChain Utility Module
 * Provides wrapper functions for PathChain library operations
 * 
 * PathChain stores data as Protocol Buffer encoded files in a filesystem structure:
 * files/
 * ├── moments/        - Timestamp records
 * ├── entities/       - Entity records (pioneer stored here)
 * ├── pioneer/        - Pioneer entity reference
 * ├── secrets/        - Global secrets
 * ├── {author}/secrets/   - Author-specific secrets
 * ├── {author}/entities/  - Author-created entities
 * └── ...
 */

let pathchain;

try {
  pathchain = require('pathchain');
} catch (error) {
  console.warn('PathChain library not available:', error.message);
  pathchain = null;
}

/**
 * Check if PathChain is available
 */
const isAvailable = () => {
  return pathchain !== null;
};

/**
 * Create the pioneer entity (first entity in the system)
 * Pioneer is the root of all entity hierarchies
 * @param {string} datetime - Optional creation datetime
 * @param {string} format - Optional datetime format
 * @returns {string} - Pioneer entity hash
 */
const createPioneer = (datetime = null, format = null) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  
  if (datetime && format) {
    return pathchain.makePioneer(datetime, format);
  } else if (datetime) {
    return pathchain.makePioneer(datetime);
  }
  return pathchain.makePioneer();
};

/**
 * Get pioneer entity object
 * @param {string} pioneerHash - Pioneer hash
 * @returns {Object} - Pioneer entity object
 */
const getPioneer = (pioneerHash) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.getPioneerObj(pioneerHash);
};

/**
 * Create a new entity using a secret
 * @param {string} secretHash - Secret hash to use
 * @param {string} format - Optional datetime format
 * @returns {string} - New entity hash
 */
const createEntity = (secretHash, format = null) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  
  if (format) {
    return pathchain.makeEntity(secretHash, format);
  }
  return pathchain.makeEntity(secretHash);
};

/**
 * Get entity object by hash
 * @param {string} entityHash - Entity hash
 * @param {string} authorPath - Optional author path
 * @returns {Object} - Entity object
 */
const getEntity = (entityHash, authorPath = '') => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.getEntityObj(entityHash, authorPath);
};

/**
 * Create a secret for an entity
 * @param {string} authorHash - Author entity hash
 * @param {string} format - Optional datetime format
 * @returns {string} - Secret hash
 */
const createSecret = (authorHash = '', format = null) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  
  if (format) {
    return pathchain.makeSecret(authorHash, format);
  }
  return pathchain.makeSecret(authorHash);
};

/**
 * Get secret object by hash
 * @param {string} secretHash - Secret hash
 * @param {string} authorPath - Optional author path
 * @returns {Object} - Secret object
 */
const getSecret = (secretHash, authorPath = '') => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.getSecretObj(secretHash, authorPath);
};

/**
 * Check if a secret has been used
 * @param {string} secretHash - Secret hash
 * @returns {boolean} - True if secret is used
 */
const isSecretUsed = (secretHash) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.isSecretUsed(secretHash);
};

/**
 * Mark a secret as used
 * @param {string} secretHash - Secret hash
 * @returns {Object} - Updated secret object
 */
const useSecret = (secretHash) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.useSecret(secretHash);
};

/**
 * Get any object by its address path
 * @param {string} address - Object address (e.g., "entities/hash", "secrets/hash")
 * @returns {Object} - Decoded object
 */
const getObject = (address) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.getObj(address);
};

/**
 * Get object type from address
 * @param {string} address - Object address
 * @returns {string} - Object type name
 */
const getObjectType = (address) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.getType(address);
};

/**
 * Create a moment (timestamp record)
 * @param {string} datetime - Datetime string
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} z - Z coordinate
 * @param {string} format - Datetime format
 * @returns {string} - Moment hash
 */
const createMoment = (datetime = null, lat = 0, lon = 0, x = 0, y = 0, z = 0, format = null) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.makeMoment(datetime, lat, lon, x, y, z, format);
};

/**
 * Get moment object
 * @param {string} momentHash - Moment hash
 * @returns {Object} - Moment object
 */
const getMoment = (momentHash) => {
  if (!pathchain) {
    throw new Error('PathChain library not available');
  }
  return pathchain.getMomentObj(momentHash);
};

/**
 * Extract hash from path string
 * @param {string} path - PathChain path (e.g., "entities/abc123")
 * @returns {string} - Hash portion
 */
const extractHash = (path) => {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1];
};

/**
 * Normalize secret input - accepts both "secrets/hash" and "hash" formats
 * @param {string} secretInput - Secret input (with or without "secrets/" prefix)
 * @returns {string} - Normalized secret hash (just the hash part)
 */
const normalizeSecretHash = (secretInput) => {
  if (!secretInput) return '';
  // Remove leading/trailing whitespace
  const trimmed = secretInput.trim();
  // If it starts with "secrets/", extract the hash part
  if (trimmed.startsWith('secrets/')) {
    return trimmed.substring(8); // Remove "secrets/" prefix
  }
  // Otherwise, assume it's already just the hash
  return trimmed;
};

/**
 * Extract type from path string
 * @param {string} path - PathChain path
 * @returns {string} - Type portion (e.g., "entities", "secrets")
 */
const extractType = (path) => {
  if (!path) return '';
  const parts = path.split('/');
  // Handle both "entities/hash" and "author/entities/hash"
  for (const part of parts) {
    if (['entities', 'secrets', 'moments', 'nodes', 'links', 'paths', 'labels'].includes(part)) {
      return part;
    }
  }
  return parts[0];
};

module.exports = {
  isAvailable,
  createPioneer,
  getPioneer,
  createEntity,
  getEntity,
  createSecret,
  getSecret,
  isSecretUsed,
  useSecret,
  getObject,
  getObjectType,
  createMoment,
  getMoment,
  extractHash,
  extractType,
  normalizeSecretHash
};

