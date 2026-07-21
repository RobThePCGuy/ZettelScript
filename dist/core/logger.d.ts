/**
 * Lightweight logger with configurable log levels
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4
}
export interface LoggerOptions {
    level?: LogLevel;
    prefix?: string;
}
/**
 * Simple logger with log levels
 */
export declare class Logger {
    private level;
    private prefix;
    constructor(options?: LoggerOptions);
    /**
     * Set the log level
     */
    setLevel(level: LogLevel): void;
    /**
     * Get the current log level
     */
    getLevel(): LogLevel;
    /**
     * Format a log message with optional prefix
     */
    private format;
    /**
     * Log a debug message
     */
    debug(message: string, ...args: unknown[]): void;
    /**
     * Log an info message
     */
    info(message: string, ...args: unknown[]): void;
    /**
     * Log a warning message
     */
    warn(message: string, ...args: unknown[]): void;
    /**
     * Log an error message
     */
    error(message: string, ...args: unknown[]): void;
    /**
     * Create a child logger with a prefix
     */
    child(prefix: string): Logger;
}
/**
 * Get the default logger
 */
export declare function getLogger(): Logger;
/**
 * Set the default logger
 */
export declare function setDefaultLogger(logger: Logger): void;
/**
 * Create a new logger with the given options
 */
export declare function createLogger(options?: LoggerOptions): Logger;
/**
 * Configure the default logger
 */
export declare function configureLogger(options: LoggerOptions): void;
//# sourceMappingURL=logger.d.ts.map