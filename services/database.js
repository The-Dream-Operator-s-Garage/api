const mariadb = require('mariadb');

let pool = null;

const initialize = async () => {
  try {
    pool = mariadb.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pathos_db',
      connectionLimit: 5,
      acquireTimeout: 30000,
      timeout: 30000
    });

    // Test connection
    const conn = await pool.getConnection();
    console.log('MariaDB connection established');
    conn.release();
    
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

