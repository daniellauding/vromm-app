#!/usr/bin/env node

/**
 * Comprehensive development server startup script
 * Handles memory management, cache clearing, and automatic restarts
 */

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_MEMORY_MB = 12288; // 12GB
const MEMORY_THRESHOLD = 0.75; // 75% of max memory
const CHECK_INTERVAL = 20000; // 20 seconds
const MAX_RESTARTS = 15;
const RESTART_DELAY = 5000; // 5 seconds

let childProcess = null;
let restartCount = 0;
let isRestarting = false;
let memoryCheckInterval = null;

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
  
  console.log(`[${timestamp}] Memory: RSS:${mem.rss}MB | Heap:${mem.heapUsed}/${mem.heapTotal}MB | System:${mem.usage}%`);
  
  // Check if we need to restart
  if (mem.heapUsed > MAX_MEMORY_MB * MEMORY_THRESHOLD) {
    console.warn(`⚠️  HIGH MEMORY: ${mem.heapUsed}MB (${Math.round(mem.heapUsed/MAX_MEMORY_MB*100)}% of limit)`);
    if (!isRestarting) {
      restartProcess();
    }
  }
}

function clearCaches() {
  console.log('🧹 Clearing caches...');
  
  const cachesToClear = [
    'node_modules/.cache',
    '.expo',
    'dist',
    'dist-web'
  ];

  cachesToClear.forEach(cache => {
    const cachePath = path.join(process.cwd(), cache);
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
        console.log(`✅ Cleared ${cache}`);
      } catch (error) {
        console.log(`⚠️  Could not clear ${cache}`);
      }
    }
  });
}

function startProcess() {
  if (isRestarting) return;
  
  console.log('🚀 Starting Expo development server...');
  console.log(`Memory limit: ${MAX_MEMORY_MB}MB | Threshold: ${Math.round(MEMORY_THRESHOLD * 100)}%`);
  
  // Clear caches every 3rd restart
  if (restartCount > 0 && restartCount % 3 === 0) {
    clearCaches();
  }
  
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
      NODE_OPTIONS: '--max-old-space-size=12288 --optimize-for-size --gc-interval=100',
      EXPO_NO_METRO_LAZY: '1' // Disable lazy loading to reduce memory usage
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
  console.log('🔄 Restarting due to high memory usage...');
  
  // Force garbage collection
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
  console.log('\n🛑 Shutting down development server...');
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
  }
  if (childProcess && !childProcess.killed) {
    childProcess.kill('SIGTERM');
  }
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
console.log('📊 Memory-Protected Expo Development Server');
console.log('This server will automatically restart if memory usage gets too high');
console.log('');

startProcess();

// Start memory monitoring
memoryCheckInterval = setInterval(logMemoryUsage, CHECK_INTERVAL);
