#!/usr/bin/env node

/**
 * Start script with aggressive memory protection
 * This script will restart the development server if memory usage gets too high
 */

const { spawn } = require('child_process');
const os = require('os');

// Configuration
const MAX_MEMORY_MB = 12288; // 12GB
const MEMORY_THRESHOLD = 0.80; // 80% of max memory
const CHECK_INTERVAL = 15000; // 15 seconds
const MAX_RESTARTS = 10;
const RESTART_DELAY = 3000; // 3 seconds

let childProcess = null;
let restartCount = 0;
let isRestarting = false;

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
    console.warn(`⚠️  HIGH MEMORY USAGE: ${mem.heapUsed}MB (${Math.round(mem.heapUsed/MAX_MEMORY_MB*100)}% of limit)`);
    if (!isRestarting) {
      restartProcess();
    }
  }
}

function startProcess() {
  if (isRestarting) return;
  
  console.log('🚀 Starting Expo development server with memory protection...');
  console.log(`Memory limit: ${MAX_MEMORY_MB}MB | Threshold: ${Math.round(MEMORY_THRESHOLD * 100)}%`);
  
  childProcess = spawn('node', [
    '--max-old-space-size=12288',
    '--optimize-for-size',
    '--gc-interval=100',
    '--max-semi-space-size=128',
    '--expose-gc',
    'node_modules/.bin/expo',
    'start'
  ], {
    stdio: 'inherit',
    env: { 
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=12288 --optimize-for-size --gc-interval=100'
    }
  });

  childProcess.on('exit', (code, signal) => {
    console.log(`Process exited with code ${code} and signal ${signal}`);
    if (code !== 0 && restartCount < MAX_RESTARTS && !isRestarting) {
      console.log(`Restarting in ${RESTART_DELAY/1000} seconds... (${restartCount + 1}/${MAX_RESTARTS})`);
      setTimeout(() => {
        restartCount++;
        isRestarting = false;
        startProcess();
      }, RESTART_DELAY);
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
  if (isRestarting || !childProcess) return;
  
  isRestarting = true;
  console.log('🔄 Restarting process due to high memory usage...');
  
  // Force garbage collection before restart
  if (global.gc) {
    console.log('🧹 Running garbage collection...');
    global.gc();
  }
  
  childProcess.kill('SIGTERM');
  
  setTimeout(() => {
    if (childProcess && !childProcess.killed) {
      console.log('Force killing process...');
      childProcess.kill('SIGKILL');
    }
    restartCount++;
    isRestarting = false;
    startProcess();
  }, 2000);
}

function cleanup() {
  console.log('\n🛑 Shutting down memory-protected server...');
  if (childProcess && !childProcess.killed) {
    childProcess.kill('SIGTERM');
  }
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start monitoring
console.log('📊 Memory-Protected Expo Server');
console.log('This server will automatically restart if memory usage gets too high');
console.log('');

startProcess();

// Monitor memory usage
setInterval(logMemoryUsage, CHECK_INTERVAL);
