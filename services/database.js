const mariadb = require('mariadb');
require('dotenv').config();

let pool = null;

// Check if connecting to AWS RDS
const isAWS = process.env.DB_HOST?.includes('rds') || process.env.DB_SSL === 'true';

const initialize = async () => {
  try {
    pool = mariadb.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pathos_db',
      connectionLimit: 5,
      acquireTimeout: 60000, // Increased to 60 seconds for AWS RDS
      timeout: 60000,
      // AWS RDS requires SSL
      ssl: isAWS ? {
        rejectUnauthorized: false // AWS RDS uses self-signed certificates
      } : false,
      // Additional connection options for AWS RDS
      connectTimeout: 60000,
      socketTimeout: 60000
    });

    // Test connection with retry logic
    let retries = 3;
    let conn = null;
    
    while (retries > 0) {
      try {
        conn = await pool.getConnection();
        console.log('MariaDB connection established');
        conn.release();
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }
        console.log(`Connection attempt failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }
    
    return pool;
  } catch (error) {
    console.error('Error initializing database pool:', error);
    throw error;
  }
};

const getConnection = async () => {
  if (!pool) {
    await initialize();
  }
  return await pool.getConnection();
};

const query = async (sql, params) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.query(sql, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

const close = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  initialize,
  getConnection,
  query,
  close
};

