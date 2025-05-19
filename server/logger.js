const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Main log file path
const LOG_FILE = path.join(logsDir, 'item-debug.log');

// Helper to clear logs
function clearLog() {
  try {
    fs.writeFileSync(LOG_FILE, '');
    console.log('Logs cleared successfully');
  } catch (err) {
    console.error('Error clearing logs:', err);
  }
}

// Helper to log to file and console
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] ${message}`;
  
  if (data) {
    if (typeof data === 'object') {
      logEntry += `: ${JSON.stringify(data, null, 2)}`;
    } else {
      logEntry += `: ${data}`;
    }
  }
  
  // Log to console
  console.log(logEntry);
  
  // Append to log file
  try {
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

// Specialized function for deletion tracking
function logDeletion(type, id, message, data = null) {
  log(`[DELETION-${type.toUpperCase()}] ID ${id}: ${message}`, data);
}

// Specialized function for item movement tracking
function logItemMovement(itemId, fromCategory, toCategory, success = true) {
  const status = success ? 'SUCCESS' : 'FAILED';
  log(`[ITEM-MOVEMENT] ${status}: Item #${itemId} moved from category ${fromCategory} to ${toCategory}`);
}

module.exports = {
  log,
  logDeletion,
  logItemMovement,
  clearLog
};