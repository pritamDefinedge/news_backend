import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define console format
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        ({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
                msg += JSON.stringify(metadata);
            }
            return msg;
        }
    )
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: consoleFormat
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            format: logFormat
        }),
        // File transport for error logs
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            format: logFormat
        })
    ],
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'exceptions.log'),
            format: logFormat
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'rejections.log'),
            format: logFormat
        })
    ]
});

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Add request ID to all log messages
logger.requestLogger = (req) => {
    return {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Give the logger time to write the error before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

export default logger;
