import { Platform } from 'react-native';
import { logWarn, logError, logInfo } from './logger';

interface PerformanceMetrics {
  startTime: number;
  warnings: string[];
  errors: string[];
  networkCalls: number;
  databaseCalls: number;
  memoryAllocations: number;
}

interface DatabaseIssue {
  type: 'timeout' | 'missing_field' | 'type_mismatch' | 'connection_error' | 'query_slow';
  table?: string;
  field?: string;
  query?: string;
  duration?: number;
  error?: string;
}

interface NetworkIssue {
  type: 'timeout' | 'connection_lost' | 'slow_response' | 'server_error';
  url?: string;
  duration?: number;
  status?: number;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    startTime: Date.now(),
    warnings: [],
    errors: [],
    networkCalls: 0,
    databaseCalls: 0,
    memoryAllocations: 0,
  };

  private slowOperationThreshold = 2000; // 2 seconds
  private criticalOperationThreshold = 5000; // 5 seconds
  private maxRetries = 3;

  // Database monitoring
  async monitorDatabaseCall<T>(
    operation: () => Promise<T>,
    tableName: string,
    queryType: 'select' | 'insert' | 'update' | 'delete' = 'select',
    expectedFields?: string[]
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.databaseCalls++;

    try {
      logInfo(`Database call started: ${queryType} on ${tableName}`, { 
        queryType, 
        tableName,
        expectedFields 
      });

      const result = await operation();
      const duration = Date.now() - startTime;

      // Check for slow queries
      if (duration > this.slowOperationThreshold) {
        const issue: DatabaseIssue = {
          type: 'query_slow',
          table: tableName,
          duration,
          query: `${queryType} on ${tableName}`,
        };
        
        logWarn(`Slow database query detected`, issue);
        this.logDatabaseIssue(issue);
      }

      // Validate result structure if expectedFields provided
      if (expectedFields && result && Array.isArray(result) && result.length > 0) {
        this.validateDatabaseResult(result[0], expectedFields, tableName);
      } else if (expectedFields && result && !Array.isArray(result)) {
        this.validateDatabaseResult(result, expectedFields, tableName);
      }

      logInfo(`Database call completed: ${queryType} on ${tableName}`, {
        duration,
        resultCount: Array.isArray(result) ? result.length : 1,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const issue: DatabaseIssue = {
        type: this.categorizeDbError(error as Error),
        table: tableName,
        query: `${queryType} on ${tableName}`,
        duration,
        error: (error as Error).message,
      };

      logError(`Database error in ${tableName}`, error as Error);
      this.logDatabaseIssue(issue);
      throw error;
    }
  }

  // Network monitoring
  async monitorNetworkCall<T>(
    operation: () => Promise<T>,
    url: string,
    method: string = 'GET'
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.networkCalls++;

    try {
      logInfo(`Network call started: ${method} ${url}`);

      const result = await operation();
      const duration = Date.now() - startTime;

      if (duration > this.slowOperationThreshold) {
        const issue: NetworkIssue = {
          type: 'slow_response',
          url,
          duration,
        };
        
        logWarn(`Slow network request detected`, issue);
        this.logNetworkIssue(issue);
      }

      logInfo(`Network call completed: ${method} ${url}`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const issue: NetworkIssue = {
        type: this.categorizeNetworkError(error as Error),
        url,
        duration,
        error: (error as Error).message,
      };

      logError(`Network error for ${url}`, error as Error);
      this.logNetworkIssue(issue);
      throw error;
    }
  }

  // Memory monitoring
  checkMemoryUsage(context: string) {
    try {
      // For web environments
      if (Platform.OS === 'web' && (global as any).performance?.memory) {
        const memory = (global as any).performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

        logInfo(`Memory usage in ${context}`, {
          used: `${usedMB.toFixed(1)}MB`,
          total: `${totalMB.toFixed(1)}MB`,
          limit: `${limitMB.toFixed(1)}MB`,
          usage: `${((usedMB / limitMB) * 100).toFixed(1)}%`,
        });

        // Warn if memory usage is high
        if (usedMB / limitMB > 0.8) {
          logWarn(`High memory usage detected in ${context}`, {
            used: usedMB,
            limit: limitMB,
            percentage: (usedMB / limitMB) * 100,
          });
        }
      }

      // For React Native - track object allocations
      this.metrics.memoryAllocations++;
    } catch (error) {
      logError('Memory check failed', error as Error);
    }
  }

  // Validate database results
  private validateDatabaseResult(result: any, expectedFields: string[], tableName: string) {
    if (!result || typeof result !== 'object') {
      const issue: DatabaseIssue = {
        type: 'type_mismatch',
        table: tableName,
        error: 'Result is not an object',
      };
      this.logDatabaseIssue(issue);
      return;
    }

    const missingFields = expectedFields.filter(field => !(field in result));
    if (missingFields.length > 0) {
      const issue: DatabaseIssue = {
        type: 'missing_field',
        table: tableName,
        field: missingFields.join(', '),
        error: `Missing fields: ${missingFields.join(', ')}`,
      };
      this.logDatabaseIssue(issue);
    }

    // Check for null values in critical fields
    const criticalFields = ['id', 'created_at', 'updated_at'];
    const nullCriticalFields = criticalFields.filter(
      field => expectedFields.includes(field) && result[field] == null
    );
    
    if (nullCriticalFields.length > 0) {
      logWarn(`Null values in critical fields`, {
        table: tableName,
        fields: nullCriticalFields,
        result,
      });
    }
  }

  // Categorize database errors
  private categorizeDbError(error: Error): DatabaseIssue['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('column') || message.includes('field')) return 'missing_field';
    if (message.includes('type') || message.includes('cast')) return 'type_mismatch';
    if (message.includes('connection')) return 'connection_error';
    
    return 'connection_error';
  }

  // Categorize network errors
  private categorizeNetworkError(error: Error): NetworkIssue['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network') || message.includes('connection')) return 'connection_lost';
    if (message.includes('server') || message.includes('500')) return 'server_error';
    
    return 'connection_lost';
  }

  // Log database issues
  private logDatabaseIssue(issue: DatabaseIssue) {
    this.metrics.errors.push(`DB: ${issue.type} in ${issue.table}`);
    
    // Log specific recommendations
    switch (issue.type) {
      case 'missing_field':
        logWarn('Database schema mismatch detected', {
          issue,
          recommendation: 'Check if database migration is needed',
          action: 'Run: supabase migration up',
        });
        break;
      case 'query_slow':
        logWarn('Slow database query detected', {
          issue,
          recommendation: 'Consider adding indexes or optimizing query',
          action: 'Review query performance',
        });
        break;
      case 'timeout':
        logWarn('Database timeout detected', {
          issue,
          recommendation: 'Check network connection and database load',
          action: 'Implement retry logic',
        });
        break;
    }
  }

  // Log network issues
  private logNetworkIssue(issue: NetworkIssue) {
    this.metrics.errors.push(`NET: ${issue.type} for ${issue.url}`);
    
    switch (issue.type) {
      case 'slow_response':
        logWarn('Slow network response detected', {
          issue,
          recommendation: 'Check server performance or implement caching',
        });
        break;
      case 'timeout':
        logWarn('Network timeout detected', {
          issue,
          recommendation: 'Implement retry logic with exponential backoff',
        });
        break;
    }
  }

  // Check for potential issues
  checkForPotentialIssues(context: string) {
    const currentTime = Date.now();
    const totalTime = currentTime - this.metrics.startTime;

    // Check if app has been running for a long time (potential memory leaks)
    if (totalTime > 300000) { // 5 minutes
      logWarn(`App running for extended time: ${Math.round(totalTime / 60000)} minutes`, {
        context,
        memoryAllocations: this.metrics.memoryAllocations,
        databaseCalls: this.metrics.databaseCalls,
        networkCalls: this.metrics.networkCalls,
      });
    }

    // Check for excessive database calls
    if (this.metrics.databaseCalls > 50) {
      logWarn(`High number of database calls detected`, {
        count: this.metrics.databaseCalls,
        context,
        recommendation: 'Consider implementing caching or reducing queries',
      });
    }

    // Check for excessive network calls
    if (this.metrics.networkCalls > 100) {
      logWarn(`High number of network calls detected`, {
        count: this.metrics.networkCalls,
        context,
        recommendation: 'Consider implementing request batching or caching',
      });
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const totalTime = Date.now() - this.metrics.startTime;
    
    return {
      totalRuntime: Math.round(totalTime / 1000),
      databaseCalls: this.metrics.databaseCalls,
      networkCalls: this.metrics.networkCalls,
      memoryAllocations: this.metrics.memoryAllocations,
      warnings: this.metrics.warnings.length,
      errors: this.metrics.errors.length,
      recentErrors: this.metrics.errors.slice(-5),
      avgCallsPerMinute: Math.round((this.metrics.databaseCalls + this.metrics.networkCalls) / (totalTime / 60000)),
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      startTime: Date.now(),
      warnings: [],
      errors: [],
      networkCalls: 0,
      databaseCalls: 0,
      memoryAllocations: 0,
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const monitorDatabaseCall = <T>(
  operation: () => Promise<T>,
  tableName: string,
  queryType: 'select' | 'insert' | 'update' | 'delete' = 'select',
  expectedFields?: string[]
) => performanceMonitor.monitorDatabaseCall(operation, tableName, queryType, expectedFields);

export const monitorNetworkCall = <T>(
  operation: () => Promise<T>,
  url: string,
  method: string = 'GET'
) => performanceMonitor.monitorNetworkCall(operation, url, method);

export const checkMemoryUsage = (context: string) => 
  performanceMonitor.checkMemoryUsage(context);

export const checkForPotentialIssues = (context: string) => 
  performanceMonitor.checkForPotentialIssues(context);

export const getPerformanceSummary = () => 
  performanceMonitor.getPerformanceSummary(); 