#!/usr/bin/env node

/**
 * Memory Monitor Script
 * Monitors Node.js memory usage and restarts the process if it gets too high
 */

const { spawn } = require('child_process');
const os = require('os');

// Configuration
const MEMORY_THRESHOLD = 0.85; // 85% of max memory
const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_MEMORY_MB = 8192; // 8GB

let childProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 5;

function getMemoryUsage() {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  
  return {
    rss: Math.round(used.rss / 1024 / 1024), // MB
    heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(used.heapTotal / 1024 / 1024), // MB
    external: Math.round(used.external / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    free: Math.round(free / 1024 / 1024), // MB
    usage: Math.round(((total - free) / total) * 100) // %
  };
}

function logMemoryUsage() {
  const mem = getMemoryUsage();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] Memory Usage:`);
  console.log(`  RSS: ${mem.rss}MB | Heap: ${mem.heapUsed}/${mem.heapTotal}MB | External: ${mem.external}MB`);
  console.log(`  System: ${mem.usage}% used (${mem.free}MB free of ${mem.total}MB total)`);
  
  // Check if we need to restart
  if (mem.heapUsed > MAX_MEMORY_MB * MEMORY_THRESHOLD) {
    console.warn(`⚠️  High memory usage detected: ${mem.heapUsed}MB (${Math.round(mem.heapUsed/MAX_MEMORY_MB*100)}% of limit)`);
    restartProcess();
  }
}

function startProcess() {
  console.log('🚀 Starting Expo development server...');
  
  childProcess = spawn('node', [
    '--max-old-space-size=8192',
    '--optimize-for-size',
    '--gc-interval=100',
    'node_modules/.bin/expo',
    'start'
  ], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  childProcess.on('exit', (code, signal) => {
    console.log(`Process exited with code ${code} and signal ${signal}`);
    if (code !== 0 && restartCount < MAX_RESTARTS) {
      console.log(`Restarting in 5 seconds... (${restartCount + 1}/${MAX_RESTARTS})`);
      setTimeout(() => {
        restartCount++;
        startProcess();
      }, 5000);
    } else if (restartCount >= MAX_RESTARTS) {
      console.error('❌ Maximum restart attempts reached. Please check your code for memory leaks.');
      process.exit(1);
    }
  });

  childProcess.on('error', (err) => {
    console.error('Process error:', err);
  });
}

function restartProcess() {
  if (childProcess && !childProcess.killed) {
    console.log('🔄 Restarting process due to high memory usage...');
    childProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (!childProcess.killed) {
        console.log('Force killing process...');
        childProcess.kill('SIGKILL');
      }
      restartCount++;
      startProcess();
    }, 2000);
  }
}

function cleanup() {
  console.log('\n🛑 Shutting down memory monitor...');
  if (childProcess && !childProcess.killed) {
    childProcess.kill('SIGTERM');
  }
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start monitoring
console.log('📊 Memory Monitor started');
console.log(`Memory limit: ${MAX_MEMORY_MB}MB`);
console.log(`Threshold: ${Math.round(MEMORY_THRESHOLD * 100)}%`);
console.log(`Check interval: ${CHECK_INTERVAL/1000}s`);
console.log('');

startProcess();

// Monitor memory usage
setInterval(logMemoryUsage, CHECK_INTERVAL);
