/**
 * A simple logger utility for the application
 */
export const logger = {
  /**
   * Log an informational message
   */
  info: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  /**
   * Log a warning message
   */
  warn: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  /**
   * Log an error message
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  
  /**
   * Log a debug message (only in development)
   */
  debug: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}; 