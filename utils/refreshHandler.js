/**
 * Refresh Handler - Detects "REFRESH" command and resets PathChain + Database
 * 
 * This module checks if the first line of user input contains "REFRESH"
 * and automatically runs the reset script.
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Check if input starts with REFRESH command
 */
function shouldRefresh(input) {
  if (!input || typeof input !== 'string') return false;
  const firstLine = input.split('\n')[0].trim().toUpperCase();
  return firstLine === 'REFRESH';
}

/**
 * Execute refresh (reset PathChain and database)
 */
function executeRefresh() {
  console.log('\n🔄 REFRESH command detected - Resetting PathChain and Database...\n');
  try {
    const resetScript = path.join(__dirname, '..', 'scripts', 'reset.js');
    execSync(`node ${resetScript}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('\n✅ Refresh completed. You can now restart your server.\n');
    return true;
  } catch (error) {
    console.error('❌ Error during refresh:', error.message);
    return false;
  }
}

module.exports = {
  shouldRefresh,
  executeRefresh
};
