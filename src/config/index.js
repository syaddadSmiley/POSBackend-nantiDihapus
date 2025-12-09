const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 1. Tentukan lingkungan (default ke 'development')
const NODE_ENV = process.env.NODE_ENV || 'development';

// 2. Logika Pemuatan Dinamis
if (NODE_ENV !== 'production') {
    // Load .env.development atau .env local
    const configFile = path.resolve(__dirname, `../../.env.${NODE_ENV}`); // Sesuaikan path jika .env ada di root luar src
    const defaultEnv = path.resolve(__dirname, '../../.env'); // Fallback ke .env biasa
    
    if (fs.existsSync(configFile)) {
        dotenv.config({ path: configFile });
        console.log(`✅ Loaded env from .env.${NODE_ENV}`);
    } else if (fs.existsSync(defaultEnv)) {
        dotenv.config({ path: defaultEnv });
        console.log(`✅ Loaded env from default .env`);
    } else {
        console.warn('⚠️ No .env file found, using system variables or defaults.');
    }
} else {
    console.log('🚀 Production Mode: Using System Environment Variables.');
}

// Helper: Cek apakah kita butuh SSL (Wajib untuk TiDB Cloud)
// Kita anggap butuh SSL jika di Production ATAU jika Host-nya mengandung 'tidbcloud'
const useSSL = NODE_ENV === 'production' || (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud'));

module.exports = {
    app: {
        port: process.env.PORT || 8002, // Render pakai PORT, bukan DEV_APP_PORT
        appName: process.env.APP_NAME || 'server-pos',
        env: NODE_ENV,
    },
    db: {
        // Support penamaan variabel TiDB (DB_USER) dan kode lama (DB_USERNAME)
        username: process.env.DB_USER || process.env.DB_USERNAME || 'root', 
        password: process.env.DB_PASSWORD || process.env.DB_PASS || null,
        database: process.env.DB_NAME || 'sakila',
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 4000, // Default TiDB Port
        dialect: 'mysql',
        logging: NODE_ENV === 'development' ? console.log : false, // Matikan log SQL di production agar bersih
        
        // KONFIGURASI KRUSIAL UNTUK TIDB:
        dialectOptions: useSSL ? {
            ssl: {
                require: true,
                rejectUnauthorized: true, // TiDB menggunakan Public CA yang valid
                minVersion: 'TLSv1.2'
            }
        } : {} // Kosongkan jika di localhost biasa
    },
    winiston: {
        logpath: './logs/',
    },
    auth: {
        // Pastikan variabel ini diset di Render Environment Variables!
        // Jangan mengandalkan default string ini di Production.
        aes_iv: process.env.IV || 'UUZWaWFYTnVhWHBF', 
        aes_secret: process.env.AES_SECRET || 'UUZWaWFYTnVhWHBFWlhZeU1ESXlYMEZG',
        jwt_secret: process.env.JWT_SECRET || 'UUZWaWFYTnVhWHBFWlhZeU1ESXlYMHBYVkFVRGV2MjAyMj09',
        jwt_expiresin: process.env.JWT_EXPIRES_IN || '1d',
        saltRounds: parseInt(process.env.SALT_ROUND) || 10,
        refresh_token_secret: process.env.REFRESH_TOKEN_SECRET || 'QFViaXNuaXpEZXYyMDIy',
        refresh_token_expiresin: process.env.REFRESH_TOKEN_EXPIRES_IN || '2d',
    },
    sendgrid: {
        api_key: process.env.SEND_GRID_API_KEY,
        api_user: process.env.SENDGRID_USERNAME,
        from_email: process.env.FROM_EMAIL,
    },
    office365: {
        host: process.env.OFFICE365_HOST || 'smtp.office365.com',
        port: process.env.OFFICE365_PORT || 587,
        secure: process.env.OFFICE365_SECURE === 'true',
        from: process.env.OFFICE365_FROM,
        auth: {
            user: process.env.OFFICE365_USER,
            pass: process.env.OFFICE365_PASS,
        },
    },
    files: {
    }
};