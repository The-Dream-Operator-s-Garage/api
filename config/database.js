const { Sequelize } = require('sequelize');
require('dotenv').config();

// Optimized connection settings for AWS RDS
const isAWS = process.env.DB_HOST?.includes('rds') || process.env.DB_SSL === 'true';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'pathos_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mariadb',
    dialectOptions: {
      // AWS RDS requires SSL
      ssl: isAWS ? {
        rejectUnauthorized: false // AWS RDS uses self-signed certificates
      } : false,
      connectTimeout: 60000, // 60 seconds for AWS RDS
      // Additional MariaDB options
      options: {
        requestTimeout: 60000
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // Increased to 60 seconds for AWS RDS
      idle: 10000,
      evict: 1000 // Check for idle connections every second
    },
    retry: {
      max: 3, // Retry connection up to 3 times
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ER_CONNECTION_TIMEOUT/,
        /SequelizeConnectionError/
      ]
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};

