/**
 * Conditional logging utility
 * - In development: logs work normally
 * - In production: logs are silenced (or could be sent to monitoring service)
 */

const isDev = import.meta.env.DEV;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerOptions {
  prefix?: string;
  forceInProduction?: boolean;
}

class Logger {
  private prefix: string;
  private forceInProduction: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.forceInProduction = options.forceInProduction || false;
  }

  private shouldLog(): boolean {
    return isDev || this.forceInProduction;
  }

  private formatMessage(level: LogLevel, ...args: unknown[]): unknown[] {
    if (this.prefix) {
      return [`[${this.prefix}]`, ...args];
    }
    return args;
  }

  log(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.log(...this.formatMessage('log', ...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.info(...this.formatMessage('info', ...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.warn(...this.formatMessage('warn', ...args));
    }
  }

  error(...args: unknown[]): void {
    // Errors are always logged, even in production
    console.error(...this.formatMessage('error', ...args));
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.debug(...this.formatMessage('debug', ...args));
    }
  }

  // Create a child logger with a specific prefix
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({ 
      prefix: childPrefix, 
      forceInProduction: this.forceInProduction 
    });
  }
}

// Default logger instance
export const logger = new Logger();

// Create named loggers for different modules
export const createLogger = (prefix: string, options?: Omit<LoggerOptions, 'prefix'>): Logger => {
  return new Logger({ prefix, ...options });
};

// Quick access functions that use the default logger
export const log = (...args: unknown[]): void => logger.log(...args);
export const logInfo = (...args: unknown[]): void => logger.info(...args);
export const logWarn = (...args: unknown[]): void => logger.warn(...args);
export const logError = (...args: unknown[]): void => logger.error(...args);
export const logDebug = (...args: unknown[]): void => logger.debug(...args);

export default logger;
