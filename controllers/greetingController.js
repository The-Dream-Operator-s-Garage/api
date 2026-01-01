const greetingService = require('../services/greetingService');

const getGreeting = async (req, res) => {
  try {
    const greeting = await greetingService.getGreeting();
    res.json({
      success: true,
      message: greeting.message,
      timestamp: greeting.timestamp
    });
  } catch (error) {
    console.error('Error in getGreeting controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getGreeting
};

