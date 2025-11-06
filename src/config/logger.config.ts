import * as winston from 'winston';
import * as path from 'path';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const logDir = 'logs';

const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.ms(),
);

export const INFO_LEVEL = 'info';
export const DEBUG_LEVEL = 'debug';
export const WARN_LEVEL = 'warn';
export const ERROR_LEVEL = 'error';

export const winstonConfig = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },

    transports: [
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug'
        }),

        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: customFormat,
            maxsize: 10485760,
            maxFiles: 5,
            tailable: true,
            level: 'debug' 
        }),

        new winston.transports.File({
            filename: path.join(logDir, 'errors.log'),
            level: 'error',
            format: customFormat,
            maxsize: 10485760,
            maxFiles: 5,
        }),

        new winston.transports.File({
            filename: path.join(logDir, 'warns.log'),
            level: 'warn',
            format: customFormat,
            maxsize: 10485760,
            maxFiles: 5,
        }),


    ],

    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'errors.log')
        })
    ],

    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'errors.log')
        })
    ],

    exitOnError: false,
};