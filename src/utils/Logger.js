const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const DailyRotate = require('winston-daily-rotate-file');

let infoLogger;
let errorLogger;
let warnLogger;
let allLogger;

class Logger {
    constructor() {
        let env = process.env.NODE_ENV || 'development';
        let logDir = './logs';
        
        // --- PERBAIKAN 1: Cek apakah Production? ---
        const isProduction = env === 'production';

        // Hanya buat folder jika BUKAN production
        if (!isProduction) {
            if (process.env.LOG_DIR == null) {
                if (!fs.existsSync(logDir)) {
                    console.log('creating log directory');
                    try {
                        fs.mkdirSync(logDir);
                    } catch (e) {
                        console.error('Failed to create log dir, ignoring:', e);
                    }
                }
            } else {
                if (!fs.existsSync(process.env.LOG_DIR)) {
                    console.log('creating log directory');
                    try {
                        fs.mkdirSync(process.env.LOG_DIR);
                    } catch (e) {
                        console.error('Failed to create log dir, ignoring:', e);
                    }
                }
                logDir = process.env.LOG_DIR;
            }
        }

        // --- PERBAIKAN 2: Logic Transports Dinamis ---
        // Kita siapkan fungsi helper untuk menentukan transport apa yang dipakai
        // Jika Production: Cuma Console.
        // Jika Dev: Console + File (DailyRotate).
        
        const getTransports = (level, filenamePattern) => {
            const t = [];
            
            // 1. Selalu tambahkan Console (agar muncul di Vercel Logs)
            t.push(new transports.Console({
                levels: level,
                format: format.combine(
                    format.colorize(),
                    format.printf(
                        info => `${info.timestamp} ${info.level}: ${info.message}`,
                    ),
                ),
            }));

            // 2. Hanya tambahkan File Writer jika BUKAN Production
            if (!isProduction) {
                t.push(new (DailyRotate)({
                    filename: `${logDir}/%DATE%-${filenamePattern}.log`,
                    datePattern: 'YYYY-MM-DD',
                }));
            }
            
            return t;
        };

        // --- SETUP LOGGER ---

        infoLogger = createLogger({
            level: env === 'development' ? 'info' : 'debug',
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
            ),
            transports: getTransports('info', 'info-results'),
            exitOnError: false,
        });

        errorLogger = createLogger({
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(error => `${error.timestamp} ${error.level}: ${error.message}`)
            ),
            transports: getTransports('error', 'errors-results'),
            exitOnError: false,
        });

        warnLogger = createLogger({
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(warn => `${warn.timestamp} ${warn.level}: ${warn.message}`)
            ),
            transports: getTransports('warn', 'warnings-results'),
            exitOnError: false,
        });

        // Khusus All Logger (Biasanya cuma file, kita handle khusus)
        const allTransports = [];
        if (!isProduction) {
             allTransports.push(new (DailyRotate)({
                filename: `${logDir}/%DATE%-results.log`,
                datePattern: 'YYYY-MM-DD',
            }));
        } else {
            // Di production, allLogger kirim ke console saja sebagai debug (silent juga boleh)
            allTransports.push(new transports.Console({ silent: true })); 
        }

        allLogger = createLogger({
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(silly => `${silly.timestamp} ${silly.level}: ${silly.message}`)
            ),
            transports: allTransports,
            exitOnError: false,
        });
    }

    log(message, severity, data) {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        if (severity == null || infoLogger.levels[severity] == null) {
            this.severity = 'info';
        }
        if (severity === 'info') {
            infoLogger.log(severity, message, data);
            allLogger.log(severity, message, data);
        } else if (severity === 'error') {
            errorLogger.log(severity, message);
            allLogger.log(severity, message, data);
        } else if (severity === 'warn') {
            warnLogger.log(severity, message, data);
            allLogger.log(severity, message, data);
        }
    }
}

module.exports = Logger;