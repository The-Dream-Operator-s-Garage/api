const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// REFRESH command handler - check if first argument is "REFRESH"
if (process.argv.length > 2 && process.argv[2].toUpperCase() === 'REFRESH') {
  const { executeRefresh } = require('./utils/refreshHandler');
  executeRefresh();
  process.exit(0);
}

const greetingRoutes = require('./routes/greetingRoutes');
const authRoutes = require('./routes/authRoutes');
const ownerTypeRoutes = require('./routes/ownerTypeRoutes');
const { sequelize, testConnection } = require('./config/database');
const { syncModels } = require('./models');
const { initializeDatabase } = require('./services/dbInit');
const { initializeSystem } = require('./services/authService');
const pathchainUtil = require('./utils/pathchain');
const { Entity, Secret } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files (CSS, images, fonts, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api', greetingRoutes);
app.use('/api/identity', authRoutes);
app.use('/api', ownerTypeRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Initialize database connection and pathchain
const startDatabase = async () => {
  try {
    // First, ensure database exists and schema is created
    console.log('Initializing database...');
    await initializeDatabase();
    
    // Then test Sequelize connection
    console.log('Testing Sequelize connection...');
    const connected = await testConnection();
    
    if (connected) {
      // Load models (don't sync - tables already exist)
      await syncModels();
      console.log('Database models loaded');
      
      // Initialize PathChain system
      if (pathchainUtil.isAvailable()) {
        console.log('Initializing PathChain system...');
        try {
          const { pioneer, secret, isNew, secretHash } = await initializeSystem();
          
          if (isNew && pioneer) {
            // Get secret hash from initialization result
            const pioneerHash = pioneer.path.split('/').pop();
            // Use secretHash from result, fallback to secret.path, then pioneer hash
            const finalSecretHash = secretHash || (secret && secret.path ? secret.path.split('/').pop() : pioneerHash);
            
            console.log('\n========================================');
            console.log('PIONEER HASH:', pioneerHash);
            console.log('PIONEER SECRET (save this!):', finalSecretHash);
            console.log('⚠️  NOTE: Use the SECRET hash above, NOT the pioneer hash!');
            console.log('You can use this secret to register new users.');
            console.log('Format: secrets/' + finalSecretHash + ' or just ' + finalSecretHash);
            console.log('========================================\n');
          } else if (pioneer) {
            // Check if pioneer secret has been used
            try {
              const pioneerHash = pioneer.path.split('/').pop();
              // Use secretHash from result if available
              let actualSecretHash = secretHash;
              
              // If not in result, try to find it from filesystem
              if (!actualSecretHash) {
                try {
                  const fs = require('fs');
                  const path = require('path');
                  const filesDir = path.join(__dirname, 'files');
                  const pioneerSecretsDir = path.join(filesDir, pioneerHash, 'secrets');
                  
                  if (fs.existsSync(pioneerSecretsDir)) {
                    const secretFiles = fs.readdirSync(pioneerSecretsDir);
                    if (secretFiles.length > 0) {
                      actualSecretHash = secretFiles[0];
                    }
                  }
                } catch (err) {
                  console.warn('Could not read secret from filesystem:', err.message);
                }
              }
              
              // Try to find secret in database
              let dbSecret = null;
              if (actualSecretHash) {
                dbSecret = await Secret.findByPath(`secrets/${actualSecretHash}`);
              }
              
              // If not found, try with pioneer hash
              if (!dbSecret) {
                dbSecret = await Secret.findByPath(`secrets/${pioneerHash}`);
              }
              
              // If still not found, try to get unused secrets owned by pioneer
              if (!dbSecret) {
                const unusedSecrets = await Secret.findUnusedByOwner(pioneer.id);
                if (unusedSecrets && unusedSecrets.length > 0) {
                  dbSecret = unusedSecrets[0];
                  actualSecretHash = dbSecret.path.split('/').pop();
                }
              }
              
              // Use the actual secret hash we found
              const displaySecretHash = actualSecretHash || (dbSecret ? dbSecret.path.split('/').pop() : pioneerHash);
              
              if (dbSecret && !dbSecret.isUsed()) {
                console.log('\n========================================');
                console.log('PIONEER HASH:', pioneerHash);
                console.log('PIONEER SECRET (not yet used):', displaySecretHash);
                console.log('You can use this secret to register new users.');
                console.log('Format: secrets/' + displaySecretHash + ' or just ' + displaySecretHash);
                console.log('========================================\n');
              } else if (dbSecret) {
                console.log('System initialized. Pioneer secret has been used.');
              } else {
                // Secret not found in database, but we found it in filesystem
                if (actualSecretHash) {
                  console.log('\n========================================');
                  console.log('PIONEER HASH:', pioneerHash);
                  console.log('PIONEER SECRET (not yet used):', actualSecretHash);
                  console.log('You can use this secret to register new users.');
                  console.log('Format: secrets/' + actualSecretHash + ' or just ' + actualSecretHash);
                  console.log('========================================\n');
                } else {
                  console.log('System initialized. Could not determine pioneer secret.');
                }
              }
            } catch (secretErr) {
              console.error('Error checking pioneer secret status:', secretErr.message);
              // Don't fail the entire initialization if secret check fails
            }
          }
        } catch (err) {
          console.error('PathChain initialization error:', err);
          console.error('Error stack:', err.stack);
        }
      } else {
        console.log('PathChain library not available');
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
    // Don't exit - allow server to start even if DB fails
    // This allows for graceful degradation
  }
};

startDatabase();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
