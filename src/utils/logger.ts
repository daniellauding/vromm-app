import { Platform } from 'react-native';

export interface MemoryInfo {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  timestamp: number;
  screen?: string;
}

export interface NavigationLog {
  from: string;
  to: string;
  timestamp: number;
  memoryBefore?: MemoryInfo;
  memoryAfter?: MemoryInfo;
}

export interface PerformanceLog {
  screen: string;
  action: string;
  duration: number;
  timestamp: number;
  memory?: MemoryInfo;
}

class Logger {
  private logs: any[] = [];
  private navigationLogs: NavigationLog[] = [];
  private performanceLogs: PerformanceLog[] = [];
  private memoryLogs: MemoryInfo[] = [];
  private maxLogs = 1000; // Prevent memory leaks from logging itself

  // Get memory information
  getMemoryInfo(screen?: string): MemoryInfo {
    const timestamp = Date.now();

    if (Platform.OS === 'web' && (global as any).performance?.memory) {
      const memory = (global as any).performance.memory;
      return {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        timestamp,
        screen,
      };
    }

    // For React Native, we can't get exact memory but we can track other metrics
    return {
      timestamp,
      screen,
      // Add React Native specific metrics if available
    };
  }

  // Log with memory info
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any, screen?: string) {
    const timestamp = new Date().toISOString();
    const memory = this.getMemoryInfo(screen);

    const logEntry = {
      level,
      message,
      data,
      timestamp,
      memory,
      screen,
      platform: Platform.OS,
      platformVersion: Platform.Version,
    };

    // Add to internal logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console with memory info
    const memoryStr = memory.usedJSHeapSize
      ? `[Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB]`
      : '[Memory: N/A]';

    const screenStr = screen ? `[${screen}]` : '';
    const fullMessage = `${screenStr} ${memoryStr} ${message}`;

    switch (level) {
      case 'error':
        if (data !== null && data !== undefined) {
          console.error(fullMessage, data);
        } else {
          console.error(fullMessage);
        }
        break;
      case 'warn':
        if (data !== null && data !== undefined) {
          console.warn(fullMessage, data);
        } else {
          console.warn(fullMessage);
        }
        break;
      case 'debug':
        if (data !== null && data !== undefined) {
          console.debug(fullMessage, data);
        } else {
          console.debug(fullMessage);
        }
        break;
      default:
        if (data !== null && data !== undefined) {
          console.log(fullMessage, data);
        } else {
          console.log(fullMessage);
        }
    }

    // Store memory logs separately
    this.memoryLogs.push(memory);
    if (this.memoryLogs.length > 100) {
      this.memoryLogs = this.memoryLogs.slice(-100);
    }
  }

  // Navigation logging
  logNavigation(from: string, to: string) {
    const memoryBefore = this.getMemoryInfo(from);

    // Small delay to capture memory after navigation
    setTimeout(() => {
      const memoryAfter = this.getMemoryInfo(to);
      const navLog: NavigationLog = {
        from,
        to,
        timestamp: Date.now(),
        memoryBefore,
        memoryAfter,
      };

      this.navigationLogs.push(navLog);
      if (this.navigationLogs.length > 50) {
        this.navigationLogs = this.navigationLogs.slice(-50);
      }

      const memoryDiff =
        memoryAfter.usedJSHeapSize && memoryBefore.usedJSHeapSize
          ? ((memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize) / 1024 / 1024).toFixed(1)
          : 'N/A';

      this.log('info', `Navigation: ${from} → ${to} | Memory diff: ${memoryDiff}MB`, navLog, to);
    }, 100);
  }

  // Performance logging
  logPerformance(screen: string, action: string, startTime: number) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memory = this.getMemoryInfo(screen);

    const perfLog: PerformanceLog = {
      screen,
      action,
      duration,
      timestamp: endTime,
      memory,
    };

    this.performanceLogs.push(perfLog);
    if (this.performanceLogs.length > 100) {
      this.performanceLogs = this.performanceLogs.slice(-100);
    }

    this.log('debug', `Performance: ${action} took ${duration}ms`, perfLog, screen);
  }

  // Screen lifecycle logging
  logScreenMount(screenName: string) {
    this.log('info', `Screen mounted: ${screenName}`, undefined, screenName);
  }

  logScreenUnmount(screenName: string) {
    this.log('info', `Screen unmounted: ${screenName}`, undefined, screenName);
  }

  logScreenFocus(screenName: string) {
    this.log('info', `Screen focused: ${screenName}`, undefined, screenName);
  }

  logScreenBlur(screenName: string) {
    this.log('info', `Screen blurred: ${screenName}`, undefined, screenName);
  }

  // Error logging with context
  logError(error: Error, context?: string, screen?: string) {
    this.log(
      'error',
      `Error${context ? ` in ${context}` : ''}: ${error.message}`,
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context,
      },
      screen,
    );
  }

  // Memory warning
  logMemoryWarning(screen?: string) {
    const memory = this.getMemoryInfo(screen);
    this.log('warn', 'Memory warning received', memory, screen);
  }

  // Get crash report data
  getCrashReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      recentLogs: this.logs.slice(-20),
      recentNavigation: this.navigationLogs.slice(-10),
      recentPerformance: this.performanceLogs.slice(-10),
      memoryTrend: this.memoryLogs.slice(-10),
    };

    return JSON.stringify(report, null, 2);
  }

  // Export logs for debugging
  exportLogs() {
    return {
      logs: this.logs,
      navigation: this.navigationLogs,
      performance: this.performanceLogs,
      memory: this.memoryLogs,
    };
  }

  // Clear logs (useful for testing)
  clearLogs() {
    this.logs = [];
    this.navigationLogs = [];
    this.performanceLogs = [];
    this.memoryLogs = [];
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience methods
export const logInfo = (message: string, data?: any, screen?: string) =>
  logger.log('info', message, data, screen);

export const logWarn = (message: string, data?: any, screen?: string) =>
  logger.log('warn', message, data, screen);

export const logError = (messageOrError: string | Error, data?: any, screen?: string) => {
  if (messageOrError instanceof Error) {
    // If it's an Error object, use the logger's logError method
    logger.logError(messageOrError, data as string, screen);
  } else {
    // If it's a string message, use the regular log method
    logger.log('error', messageOrError, data, screen);
  }
};

export const logDebug = (message: string, data?: any, screen?: string) =>
  logger.log('debug', message, data, screen);

export const logNavigation = (from: string, to: string) => logger.logNavigation(from, to);

export const logPerformance = (screen: string, action: string, startTime: number) =>
  logger.logPerformance(screen, action, startTime);

export const logScreenMount = (screenName: string) => logger.logScreenMount(screenName);

export const logScreenUnmount = (screenName: string) => logger.logScreenUnmount(screenName);

export const logScreenFocus = (screenName: string) => logger.logScreenFocus(screenName);

export const logScreenBlur = (screenName: string) => logger.logScreenBlur(screenName);

export const getCrashReport = () => logger.getCrashReport();
