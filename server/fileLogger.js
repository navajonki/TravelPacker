const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Main log file for deletion operations
const DELETION_LOG_FILE = path.join(logsDir, 'deletion-debug.log');
// Main log file for item operations
const ITEM_LOG_FILE = path.join(logsDir, 'item-operations.log');

// Clear log files
function clearLogs() {
  try {
    fs.writeFileSync(DELETION_LOG_FILE, '');
    fs.writeFileSync(ITEM_LOG_FILE, '');
    console.log('Logs cleared successfully');
  } catch (err) {
    console.error('Error clearing logs:', err);
  }
}

// Helper to log to file and console
function logToFile(file, message, data = null) {
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
    fs.appendFileSync(file, logEntry + '\n');
  } catch (err) {
    console.error(`Error writing to log file ${file}:`, err);
  }
}

// Specialized function for deletion tracking
function logDeletion(type, id, message, data = null) {
  logToFile(DELETION_LOG_FILE, `[DELETION-${type.toUpperCase()}] ID ${id}: ${message}`, data);
}

// Specialized function for item movement tracking
function logItemOperation(operation, itemId, details) {
  logToFile(ITEM_LOG_FILE, `[ITEM-${operation.toUpperCase()}] Item #${itemId}`, details);
}

// Generic debug log for any context
function logDebug(context, message, data = null) {
  logToFile(ITEM_LOG_FILE, `[DEBUG-${context.toUpperCase()}] ${message}`, data);
}

module.exports = {
  logDeletion,
  logItemOperation,
  logDebug,
  clearLogs
};