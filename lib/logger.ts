// Advanced logger utility for structured logging with context
import fs from 'fs';
import path from 'path';
import { appendFileSync } from 'fs';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configure log file path - default to logs directory in project root
const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_FILE = process.env.LOG_FILE || 'app.log';
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB max log file size
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create log directory:', err);
}

// Define log levels as numbers for comparisons
const logLevelValues: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * Write log to file with rotation
 */
function writeToFile(message: string) {
  try {
    const logPath = path.join(LOG_DIR, LOG_FILE);
    
    // Check if log file exists and if it's too large
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > MAX_LOG_SIZE) {
        // Create backup of current log file with timestamp
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupPath = path.join(LOG_DIR, `${LOG_FILE}.${timestamp}.backup`);
        fs.renameSync(logPath, backupPath);
      }
    }
    
    appendFileSync(logPath, message + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Format object for logging - handles circular refs and formats nicely
 */
function formatObject(obj: any): string {
  try {
    // Remove circular references
    const seen = new WeakSet();
    const safeObj = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    return safeObj;
  } catch (err) {
    return `[Unformattable Object: ${err}]`;
  }
}

/**
 * Main logger function
 */
function logWithLevel(level: LogLevel, context: string, message: string, ...args: any[]) {
  // Skip logs below current level
  if (logLevelValues[level] < logLevelValues[LOG_LEVEL as LogLevel]) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => 
    typeof arg === 'object' && arg !== null ? formatObject(arg) : String(arg)
  ).join(' ');
  
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message} ${formattedArgs}`;
  
  // Always log to console for immediate feedback
  if (level === 'error') {
    console.error(logEntry);
  } else if (level === 'warn') {
    console.warn(logEntry);
  } else {
    console.log(logEntry);
  }
  
  // Also write to log file
  writeToFile(logEntry);
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, ...args: any[]) => logWithLevel('debug', context, message, ...args),
    info: (message: string, ...args: any[]) => logWithLevel('info', context, message, ...args),
    warn: (message: string, ...args: any[]) => logWithLevel('warn', context, message, ...args),
    error: (message: string, ...args: any[]) => logWithLevel('error', context, message, ...args),
  };
}

// Export a default logger
export const logger = createLogger('app'); 