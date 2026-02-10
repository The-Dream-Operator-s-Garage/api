const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Connect to MariaDB server without specifying a database
 */
const connectToServer = async () => {
  const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    // Don't specify database - connect to server
    connectionLimit: 1,
    acquireTimeout: 60000, // 60 seconds for AWS RDS
    timeout: 60000,
    // AWS RDS requires SSL
    ssl: process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('rds') ? {
      rejectUnauthorized: false // AWS RDS uses self-signed certificates
    } : false
  });
  
  return pool;
};

/**
 * Check if database exists
 */
const databaseExists = async (pool, dbName) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );
    return result.length > 0;
  } catch (error) {
    console.error('Error checking database existence:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/**
 * Create database if it doesn't exist
 */
const createDatabase = async (pool, dbName) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database '${dbName}' created or already exists`);
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/**
 * Parse SQL file and split into individual statements
 * Handles triggers with custom delimiters ($$)
 */
const parseSQLFile = (sqlContent) => {
  // Remove comments and unnecessary statements
  let cleaned = sqlContent
    // Remove single-line comments
    .replace(/--[^\r\n]*/g, '')
    // Remove phpMyAdmin conditional comments
    .replace(/\/\*![\s\S]*?\*\//g, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove SET statements
    .replace(/SET\s+SQL_MODE[^;]*;/gi, '')
    .replace(/SET\s+time_zone[^;]*;/gi, '')
    .replace(/SET\s+CHARACTER_SET[^;]*;/gi, '')
    .replace(/SET\s+COLLATION[^;]*;/gi, '')
    .replace(/SET\s+NAMES[^;]*;/gi, '')
    // Remove transaction statements
    .replace(/START\s+TRANSACTION\s*;/gi, '')
    .replace(/COMMIT\s*;/gi, '')
    .trim();

  const statements = [];
  
  // First, extract all CREATE TRIGGER blocks (they use $$ as delimiter)
  const triggerRegex = /DELIMITER\s+\$\$\s*CREATE\s+TRIGGER[\s\S]*?END\s*\$\$\s*DELIMITER\s*;/gi;
  const triggers = [];
  let triggerMatch;
  
  while ((triggerMatch = triggerRegex.exec(cleaned)) !== null) {
    let triggerSQL = triggerMatch[0]
      .replace(/DELIMITER\s+\$\$/gi, '')
      .replace(/DELIMITER\s*;/gi, '')
      .replace(/\$\$/g, ';')
      .trim();
    triggers.push(triggerSQL);
    // Remove trigger from cleaned content
    cleaned = cleaned.replace(triggerMatch[0], '');
  }

  // Now split remaining SQL by semicolons
  const regularStatements = cleaned
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  // Combine regular statements and triggers
  statements.push(...regularStatements);
  statements.push(...triggers);

  // Final filtering
  return statements
    .map(stmt => stmt.trim())
    .filter(stmt => {
      if (stmt.length < 10) return false;
      if (stmt.match(/^\/\*/) || stmt.match(/^\*/)) return false;
      if (stmt.match(/^(SET|START|COMMIT|DELIMITER)/i)) return false;
      return true;
    });
};

/**
 * Execute SQL statements on a specific database
 */
const executeSQLStatements = async (pool, dbName, statements) => {
  let conn;
  try {
    conn = await pool.getConnection();
    // Select the database
    await conn.query(`USE \`${dbName}\``);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip certain statements that might cause issues
      if (
        statement.match(/^(SET|START|COMMIT|DELIMITER)/i) ||
        statement.length < 10
      ) {
        continue;
      }

      try {
        await conn.query(statement);
        if ((i + 1) % 10 === 0) {
          console.log(`  Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error) {
        // Ignore "already exists" errors for tables/indexes
        if (
          error.code === 'ER_TABLE_EXISTS_ERROR' ||
          error.code === 'ER_DUP_KEYNAME' ||
          error.code === 'ER_DUP_ENTRY' ||
          error.message.includes('already exists')
        ) {
          console.log(`  Skipping (already exists): ${statement.substring(0, 50)}...`);
          continue;
        }
        console.error(`Error executing statement ${i + 1}:`, error.message);
        console.error(`Statement: ${statement.substring(0, 200)}...`);
        // Continue with other statements
      }
    }
    
    console.log('SQL file execution completed');
  } catch (error) {
    console.error('Error executing SQL statements:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/**
 * Initialize database: create if not exists, then run SQL file
 */
const initializeDatabase = async () => {
  const dbName = process.env.DB_NAME || 'pathwjzs_tpathos';
  let serverPool = null;

  try {
    console.log('Connecting to MariaDB server...');
    serverPool = await connectToServer();

    // Check if database exists
    const exists = await databaseExists(serverPool, dbName);
    
    if (!exists) {
      console.log(`Database '${dbName}' does not exist. Creating...`);
      await createDatabase(serverPool, dbName);
    } else {
      console.log(`Database '${dbName}' already exists`);
    }

    // Read and execute SQL file
    const sqlFilePath = path.join(__dirname, '..', 'pathwjzs_tpathos.sql');
    
    if (fs.existsSync(sqlFilePath)) {
      console.log('Reading SQL file...');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      const statements = parseSQLFile(sqlContent);
      
      console.log(`Parsed ${statements.length} SQL statements from file`);
      
      if (statements.length > 0) {
        await executeSQLStatements(serverPool, dbName, statements);
      }
    } else {
      console.log(`SQL file not found at ${sqlFilePath}, skipping schema creation`);
    }

    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    if (serverPool) {
      await serverPool.end();
    }
  }
};

module.exports = {
  initializeDatabase,
  connectToServer,
  databaseExists,
  createDatabase
};
