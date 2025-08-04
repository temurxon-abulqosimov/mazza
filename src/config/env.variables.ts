import * as dotenv from 'dotenv';

dotenv.config();

export const envVariables = {
    // Telegram Bot Configuration
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    
    // Database Configuration
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'password',
    DB_NAME: process.env.DB_NAME || 'ulgur_bot',
    
    // Application Configuration
    PORT: process.env.PORT || '3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Support Configuration
    SUPPORT_USERNAME: process.env.SUPPORT_USERNAME || '@avtemur',
    
    // Admin Configuration
    ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID || '794464667',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || '@avtemur',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
    
    // Validation
    validate() {
        if (!this.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        if (!this.DB_USERNAME) {
            throw new Error('DB_USERNAME is required');
        }
        if (!this.DB_PASSWORD) {
            throw new Error('DB_PASSWORD is required');
        }
    }
};