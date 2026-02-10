#!/usr/bin/env node

/**
 * Reset Script - Wipes PathChain files and database data
 * 
 * This script:
 * 1. Deletes all PathChain files (files/ directory)
 * 2. Truncates database tables (entity, login, secret)
 * 3. Keeps the database schema intact
 * 
 * NOTE: This script clears server-side data only.
 * Browser localStorage (tokens) must be cleared manually in the browser,
 * or the frontend will automatically clear invalid tokens on next page load.
 * 
 * Usage: node scripts/reset.js
 */

const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
require('dotenv').config();

const FILES_DIR = path.join(__dirname, '..', 'files');
const DB_NAME = process.env.DB_NAME || 'pathwjzs_tpathos';

/**
 * Delete PathChain files directory
 */
function deletePathChainFiles() {
  console.log('🗑️  Deleting PathChain files...');
  
  if (fs.existsSync(FILES_DIR)) {
    try {
      fs.rmSync(FILES_DIR, { recursive: true, force: true });
      console.log('✅ PathChain files deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting PathChain files:', error.message);
      return false;
    }
  } else {
    console.log('ℹ️  PathChain files directory does not exist');
    return true;
  }
}

/**
 * Truncate database tables
 */
async function truncateDatabase() {
  console.log('🗑️  Truncating database tables...');
  
  let pool;
  try {
    pool = mariadb.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      connectionLimit: 1
    });

    const conn = await pool.getConnection();
    
    // Disable foreign key checks temporarily
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Truncate tables in correct order (respecting foreign keys)
    const tables = [
      'tevent_property',
      'tevent_label',
      'tevent',
      'post_property',
      'post_label',
      'post',
      'property',
      'entity_property',
      'entity_label',
      'organization_property',
      'organization_label',
      'organization_entity',
      'organization',
      'login',        // Has foreign key to entity
      'secret',       // Has foreign key to entity and owner_type
      'entity',       // Core table
      'label'         // Independent table
    ];
    
    console.log('   Truncating tables...');
    for (const table of tables) {
      try {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`   ✅ ${table}`);
      } catch (error) {
        // Table might not exist or have dependencies, skip
        console.log(`   ⚠️  ${table} (skipped: ${error.message})`);
      }
    }
    
    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    
    conn.release();
    console.log('✅ Database tables truncated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error truncating database:', error.message);
    return false;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Main reset function
 */
async function reset() {
  console.log('\n🔄 Starting reset process...\n');
  console.log('⚠️  WARNING: This will delete all PathChain files and database data!');
  console.log('   Database schema will be preserved.\n');
  
  // Delete PathChain files
  const filesDeleted = deletePathChainFiles();
  
  // Truncate database
  const dbTruncated = await truncateDatabase();
  
  console.log('\n' + '='.repeat(50));
  if (filesDeleted && dbTruncated) {
    console.log('✅ Reset completed successfully!');
    console.log('\nYou can now restart your server to initialize a fresh PathChain system.');
    console.log('The pioneer secret will be printed on startup.');
    console.log('\n✅ Session tokens will be automatically invalidated.');
    console.log('   The verify endpoint now checks if user entities exist in the database.');
    console.log('   After RESET, all existing tokens will be rejected on next verification.');
    console.log('   The frontend will automatically clear invalid tokens and show login forms.\n');
  } else {
    console.log('⚠️  Reset completed with some warnings.');
    console.log('Please check the output above for details.\n');
  }
  console.log('='.repeat(50) + '\n');
}

// Run the reset
reset().catch(error => {
  console.error('❌ Fatal error during reset:', error);
  process.exit(1);
});
