const db = require('./database');

const getGreeting = async () => {
  // For now, return a simple greeting
  // In the future, this could fetch from the database
  return {
    message: 'Welcome to the Pathos API! We\'re glad to have you here.',
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  getGreeting
};

