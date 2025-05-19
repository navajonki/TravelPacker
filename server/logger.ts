import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Main log file path
const logFilePath = path.join(logDir, 'deletion-debug.log');

export function log(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;
  
  // Log to console
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(logFilePath, logMessage + '\n');
}

export function clearLogs(): void {
  // Clear the log file if it exists
  if (fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
  }
}

export default {
  log,
  clearLogs
};