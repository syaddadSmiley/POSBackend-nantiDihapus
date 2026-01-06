const { createLogger, format, transports } = require('winston');
const fs = require('fs');
const DailyRotate = require('winston-daily-rotate-file');
const path = require('path');

let infoLogger;
let errorLogger;
let warnLogger;
let allLogger;

class Logger {
    constructor() {
        let env = process.env.NODE_ENV || 'development';
        
        // Pastikan folder logs selalu ada (Absolute Path agar aman di Docker)
        let logDir = path.join(process.cwd(), 'logs');

        // BUAT FOLDER SECARA PAKSA (Tidak peduli Production/Dev)
        if (!fs.existsSync(logDir)) {
            try {
                fs.mkdirSync(logDir);
                console.log(`✅ Log directory created at: ${logDir}`);
            } catch (e) {
                console.error('❌ Failed to create log dir:', e);
            }
        }

        // --- KONFIGURASI ROTASI LOG (PENTING AGAR VPS TIDAK PENUH) ---
        const createDailyRotateTransport = (filename) => {
            return new DailyRotate({
                filename: `${logDir}/%DATE%-${filename}.log`,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true, // Compress log lama jadi .gz (Hemat Space)
                maxSize: '5m',      // Ukuran max per file 5MB
                maxFiles: '14d'      // Hapus log yang lebih tua dari 14 hari
            });
        };

        const getTransports = (level, filenamePattern) => {
            const t = [];
            
            // 1. Console (Selalu Nyala)
            t.push(new transports.Console({
                levels: level,
                format: format.combine(
                    format.colorize(),
                    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
                ),
            }));

            // 2. File Log (SEKARANG NYALA DI PRODUCTION)
            t.push(createDailyRotateTransport(filenamePattern));
            
            return t;
        };

        // --- SETUP LOGGER ---

        infoLogger = createLogger({
            level: env === 'development' ? 'info' : 'info', // Production tetap butuh Info
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

        // Setup All Logger
        const allTransports = [];
        allTransports.push(createDailyRotateTransport('results')); // File
        
        // Console untuk allLogger di-silent di production agar tidak double
        if (env === 'production') {
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
        if (process.env.NODE_ENV === 'test') return;
        
        if (severity == null || infoLogger.levels[severity] == null) {
            this.severity = 'info';
        }
        
        // Pastikan data object dikonversi ke string agar terbaca di log
        let msg = message;
        if(data) {
             msg += ` ${JSON.stringify(data)}`;
        }

        if (severity === 'info') {
            infoLogger.log(severity, msg);
            allLogger.log(severity, msg);
        } else if (severity === 'error') {
            errorLogger.log(severity, msg);
            allLogger.log(severity, msg);
        } else if (severity === 'warn') {
            warnLogger.log(severity, msg);
            allLogger.log(severity, msg);
        }
    }
}

module.exports = Logger;