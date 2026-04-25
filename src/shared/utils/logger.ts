/**
 * Shared Logger - structured logging for app and cron.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | unknown, context?: LogContext): void;
}

class StandardLogger implements Logger {
  private logLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName: string = 'app') {
    this.serviceName = serviceName;
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.logLevel = envLevel ? (LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO) : LogLevel.INFO;
  }

  private jsonReplacer(_k: string, v: unknown): unknown {
    if (typeof v === 'bigint') return Number(v);
    return v;
  }

  private format(level: string, message: string, context?: LogContext): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    }, this.jsonReplacer);
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext): void {
    if (level >= this.logLevel) {
      const out = this.format(levelName, message, context);
      if (level === LogLevel.ERROR) console.error(out);
      else console.log(out);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const ctx: LogContext = { ...context };
    if (error instanceof Error) ctx.error = { message: error.message, stack: error.stack, name: error.name };
    else if (error !== undefined) ctx.error = String(error);
    this.log(LogLevel.ERROR, 'ERROR', message, ctx);
  }
}

export const logger: Logger = new StandardLogger('app');
export const createLogger = (name: string): Logger => new StandardLogger(name);
