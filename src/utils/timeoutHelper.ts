import { Alert } from 'react-native';
import { logWarn, logError, logInfo } from './logger';

interface TimeoutConfig {
  operation: string;
  timeoutMs?: number;
  showWarningMs?: number;
  showUserAlert?: boolean;
  context?: string;
}

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  timedOut: boolean;
  wasSlowWarning: boolean;
}

// Common timeout scenarios and their recommended timeouts
export const TIMEOUT_CONFIGS = {
  DATABASE_QUERY: { timeoutMs: 10000, showWarningMs: 2000 },
  DATABASE_UPDATE: { timeoutMs: 15000, showWarningMs: 3000 },
  IMAGE_UPLOAD: { timeoutMs: 30000, showWarningMs: 5000 },
  LOCATION_DETECTION: { timeoutMs: 20000, showWarningMs: 8000 },
  NETWORK_REQUEST: { timeoutMs: 15000, showWarningMs: 3000 },
  AUTH_OPERATION: { timeoutMs: 12000, showWarningMs: 4000 },
} as const;

// Potential causes for different types of slow operations
const SLOW_OPERATION_CAUSES = {
  database: [
    'Poor network connection to database',
    'Database server overloaded',
    'Missing database indexes',
    'Large result set without pagination',
    'Database migration in progress',
    'Connection pool exhausted',
  ],
  network: [
    'Slow internet connection',
    'Server overloaded or down',
    'DNS resolution issues',
    'Firewall or proxy blocking request',
    'Large payload size',
    'Geographic distance to server',
  ],
  upload: [
    'Large file size',
    'Slow upload bandwidth',
    'Image compression taking time',
    'Storage service limitations',
    'Network congestion',
    'Temporary storage service issues',
  ],
  location: [
    'GPS signal weak or unavailable',
    'Location services disabled',
    'Device in indoor/underground location',
    'Battery optimization affecting GPS',
    'Permission issues',
    'Cold GPS start (first location request)',
  ],
  auth: [
    'Network connection issues',
    'Authentication server overloaded',
    'Invalid credentials causing retries',
    'Two-factor authentication delays',
    'Session validation taking time',
    'Password hashing computation',
  ],
};

/**
 * Wraps any promise with timeout detection and comprehensive diagnostics
 */
export async function withTimeoutDiagnostics<T>(
  promise: Promise<T>,
  config: TimeoutConfig,
): Promise<OperationResult<T>> {
  const startTime = Date.now();
  const {
    operation,
    timeoutMs = 10000,
    showWarningMs = 2000,
    showUserAlert = false,
    context = 'Unknown',
  } = config;

  let warningShown = false;
  let timeoutOccurred = false;

  // Set up warning timer
  const warningTimer = setTimeout(() => {
    if (!warningShown) {
      warningShown = true;
      const duration = Date.now() - startTime;

      logWarn(`Slow operation detected: ${operation}`, {
        operation,
        context,
        duration,
        threshold: showWarningMs,
        potentialCauses: getPotentialCauses(operation),
      });

      if (showUserAlert) {
        Alert.alert(
          'Operation Taking Longer Than Expected',
          `${operation} is taking longer than usual. This might be due to network issues or server load.`,
          [{ text: 'OK' }],
        );
      }
    }
  }, showWarningMs);

  // Set up timeout timer
  const timeoutTimer = setTimeout(() => {
    timeoutOccurred = true;
    logError(
      `Operation timeout: ${operation}`,
      new Error(`Operation timed out after ${timeoutMs}ms`),
    );
  }, timeoutMs);

  try {
    // Race between the promise and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const result = await Promise.race([promise, timeoutPromise]);
    const duration = Date.now() - startTime;

    // Clear timers
    clearTimeout(warningTimer);
    clearTimeout(timeoutTimer);

    // Log successful completion
    logInfo(`Operation completed: ${operation}`, {
      operation,
      context,
      duration,
      wasSlowWarning: warningShown,
    });

    return {
      success: true,
      data: result,
      duration,
      timedOut: false,
      wasSlowWarning: warningShown,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Clear timers
    clearTimeout(warningTimer);
    clearTimeout(timeoutTimer);

    const isTimeoutError = (error as Error).message.includes('timed out');

    if (isTimeoutError) {
      logError(`Operation timeout: ${operation}`, error as Error);

      if (showUserAlert) {
        Alert.alert(
          'Operation Timed Out',
          `${operation} took too long to complete. Please check your connection and try again.`,
          [{ text: 'OK' }],
        );
      }
    } else {
      logError(`Operation failed: ${operation}`, error as Error);
    }

    return {
      success: false,
      error: error as Error,
      duration,
      timedOut: isTimeoutError,
      wasSlowWarning: warningShown,
    };
  }
}

/**
 * Get potential causes for slow operations based on operation type
 */
function getPotentialCauses(operation: string): string[] {
  const operationLower = operation.toLowerCase();

  if (operationLower.includes('database') || operationLower.includes('query')) {
    return SLOW_OPERATION_CAUSES.database;
  }
  if (operationLower.includes('upload') || operationLower.includes('image')) {
    return SLOW_OPERATION_CAUSES.upload;
  }
  if (operationLower.includes('location') || operationLower.includes('gps')) {
    return SLOW_OPERATION_CAUSES.location;
  }
  if (
    operationLower.includes('auth') ||
    operationLower.includes('login') ||
    operationLower.includes('signup')
  ) {
    return SLOW_OPERATION_CAUSES.auth;
  }
  if (
    operationLower.includes('network') ||
    operationLower.includes('api') ||
    operationLower.includes('fetch')
  ) {
    return SLOW_OPERATION_CAUSES.network;
  }

  // Default to network causes if we can't categorize
  return SLOW_OPERATION_CAUSES.network;
}

/**
 * Convenience function for database operations
 */
export function withDatabaseTimeout<T>(
  promise: Promise<T>,
  operation: string,
  context?: string,
): Promise<OperationResult<T>> {
  return withTimeoutDiagnostics(promise, {
    operation: `Database: ${operation}`,
    ...TIMEOUT_CONFIGS.DATABASE_QUERY,
    context,
  });
}

/**
 * Convenience function for network operations
 */
export function withNetworkTimeout<T>(
  promise: Promise<T>,
  operation: string,
  context?: string,
): Promise<OperationResult<T>> {
  return withTimeoutDiagnostics(promise, {
    operation: `Network: ${operation}`,
    ...TIMEOUT_CONFIGS.NETWORK_REQUEST,
    context,
  });
}

/**
 * Convenience function for upload operations
 */
export function withUploadTimeout<T>(
  promise: Promise<T>,
  operation: string,
  context?: string,
): Promise<OperationResult<T>> {
  return withTimeoutDiagnostics(promise, {
    operation: `Upload: ${operation}`,
    ...TIMEOUT_CONFIGS.IMAGE_UPLOAD,
    context,
    showUserAlert: true, // Always show alerts for uploads since users are waiting
  });
}

/**
 * Convenience function for location operations
 */
export function withLocationTimeout<T>(
  promise: Promise<T>,
  operation: string,
  context?: string,
): Promise<OperationResult<T>> {
  return withTimeoutDiagnostics(promise, {
    operation: `Location: ${operation}`,
    ...TIMEOUT_CONFIGS.LOCATION_DETECTION,
    context,
    showUserAlert: true, // Show alerts for location since users are actively waiting
  });
}

/**
 * Convenience function for auth operations
 */
export function withAuthTimeout<T>(
  promise: Promise<T>,
  operation: string,
  context?: string,
): Promise<OperationResult<T>> {
  return withTimeoutDiagnostics(promise, {
    operation: `Auth: ${operation}`,
    ...TIMEOUT_CONFIGS.AUTH_OPERATION,
    context,
    showUserAlert: true, // Show alerts for auth since users are actively waiting
  });
}

/**
 * Detect potential memory issues that might cause slowdowns
 */
export function detectMemoryIssues(context: string): boolean {
  try {
    // Check if performance.memory is available (web/some React Native environments)
    if ((global as any).performance?.memory) {
      const memory = (global as any).performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const usage = usedMB / limitMB;

      if (usage > 0.8) {
        logWarn(`High memory usage detected in ${context}`, {
          usedMB: usedMB.toFixed(1),
          limitMB: limitMB.toFixed(1),
          usage: `${(usage * 100).toFixed(1)}%`,
          potentialCauses: [
            'Memory leaks in components',
            'Large images not properly released',
            'Too many objects in memory',
            'Circular references preventing garbage collection',
            'Heavy data structures',
          ],
          recommendations: [
            'Restart the app',
            'Close other apps to free memory',
            'Check for memory leaks in recent changes',
            'Reduce image sizes',
            'Clear app data if necessary',
          ],
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    logError('Memory detection failed', error as Error);
    return false;
  }
}

/**
 * Create a comprehensive diagnostic report for troubleshooting
 */
export function createDiagnosticReport(context: string) {
  const report = {
    timestamp: new Date().toISOString(),
    context,
    platform: {
      OS: require('react-native').Platform.OS,
      version: require('react-native').Platform.Version,
    },
    memory: {} as any,
    recommendations: [] as string[],
  };

  // Memory information
  if ((global as any).performance?.memory) {
    const memory = (global as any).performance.memory;
    report.memory = {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
      usage: `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`,
    };

    const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    if (usage > 0.8) {
      report.recommendations.push('High memory usage - consider restarting app');
    }
    if (usage > 0.9) {
      report.recommendations.push('Critical memory usage - restart immediately');
    }
  }

  // General recommendations
  if (report.recommendations.length === 0) {
    report.recommendations.push('System appears to be running normally');
  }

  logInfo('Diagnostic report generated', report);
  return report;
}
