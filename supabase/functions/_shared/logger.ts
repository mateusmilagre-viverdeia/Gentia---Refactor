/**
 * Deno-compatible Logger for Edge Functions
 * - In development: logs work normally
 * - In production: logs are silenced (except errors)
 */

const getEnvironment = (): boolean => {
  try {
    const env = Deno.env.get('ENVIRONMENT');
    return env !== 'production';
  } catch {
    // If we can't read env, assume development
    return true;
  }
};

const isDev = getEnvironment();

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class EdgeLogger {
  private prefix: string;
  private forceInProduction: boolean;

  constructor(prefix: string = '', forceInProduction: boolean = false) {
    this.prefix = prefix;
    this.forceInProduction = forceInProduction;
  }

  private shouldLog(): boolean {
    return isDev || this.forceInProduction;
  }

  private formatMessage(...args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (this.prefix) {
      return [`[${timestamp}] [${this.prefix}]`, ...args];
    }
    return [`[${timestamp}]`, ...args];
  }

  log(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.log(...this.formatMessage(...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.info(...this.formatMessage(...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.warn(...this.formatMessage(...args));
    }
  }

  error(...args: unknown[]): void {
    // Errors are always logged, even in production
    console.error(...this.formatMessage(...args));
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog()) {
      console.debug(...this.formatMessage(...args));
    }
  }

  // Create a child logger with extended prefix
  child(childPrefix: string): EdgeLogger {
    const newPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
    return new EdgeLogger(newPrefix, this.forceInProduction);
  }
}

// Default logger instance
export const logger = new EdgeLogger();

// Create named loggers for different edge functions
export const createLogger = (prefix: string, forceInProduction: boolean = false): EdgeLogger => {
  return new EdgeLogger(prefix, forceInProduction);
};

// Quick access functions
export const log = (...args: unknown[]): void => logger.log(...args);
export const logInfo = (...args: unknown[]): void => logger.info(...args);
export const logWarn = (...args: unknown[]): void => logger.warn(...args);
export const logError = (...args: unknown[]): void => logger.error(...args);
export const logDebug = (...args: unknown[]): void => logger.debug(...args);

export default logger;
