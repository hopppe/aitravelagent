/**
 * A simple script to clean up old logs
 * Run with: node scripts/cleanup-logs.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOG_DIR = process.env.LOG_DIR || 'logs';
const MAX_AGE_DAYS = 7; // Remove logs older than 7 days
const MAX_BACKUP_COUNT = 5; // Keep at most 5 backup log files

console.log('Starting log cleanup...');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`Created ${LOG_DIR} directory`);
  process.exit(0); // Nothing to clean up
}

// Get all files in the logs directory
const logFiles = fs.readdirSync(LOG_DIR);
console.log(`Found ${logFiles.length} log files`);

// Get current time
const now = new Date();

// Track backup files
const backupFiles = [];

// Process each file
logFiles.forEach(file => {
  const filePath = path.join(LOG_DIR, file);
  const stats = fs.statSync(filePath);
  
  // Calculate file age in days
  const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24);
  
  // Check if it's a backup file
  if (file.includes('.backup')) {
    backupFiles.push({
      path: filePath,
      name: file,
      age: fileAge,
      time: stats.mtime
    });
    return;
  }
  
  // Remove old regular log files
  if (fileAge > MAX_AGE_DAYS) {
    console.log(`Removing old log file: ${file} (${fileAge.toFixed(1)} days old)`);
    fs.unlinkSync(filePath);
  } else {
    console.log(`Keeping log file: ${file} (${fileAge.toFixed(1)} days old)`);
  }
});

// Sort backup files by age (newest first)
backupFiles.sort((a, b) => b.time - a.time);

// Remove excess backup files
if (backupFiles.length > MAX_BACKUP_COUNT) {
  console.log(`Found ${backupFiles.length} backup files, keeping ${MAX_BACKUP_COUNT}`);
  
  for (let i = MAX_BACKUP_COUNT; i < backupFiles.length; i++) {
    const file = backupFiles[i];
    console.log(`Removing excess backup file: ${file.name} (${file.age.toFixed(1)} days old)`);
    fs.unlinkSync(file.path);
  }
} else {
  console.log(`Keeping all ${backupFiles.length} backup files`);
}

console.log('Log cleanup completed'); 