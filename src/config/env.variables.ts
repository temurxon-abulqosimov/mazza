import * as dotenv from 'dotenv';

dotenv.config();

export const envVariables = {
    // Telegram Bot Configuration
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    
    // Webhook Configuration
    WEBHOOK_URL: process.env.WEBHOOK_URL || '',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
    USE_WEBHOOK: process.env.USE_WEBHOOK === 'true',
    
    // Database Configuration - Single URL
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ulgur_bot',
    
    // Application Configuration
    PORT: process.env.PORT || '3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Support Configuration
    SUPPORT_USERNAME: process.env.SUPPORT_USERNAME || '@avtemur',
    
    // Admin Configuration
    ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID || '794464667',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || '@avtemur',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
    
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-here',
    JWT_EXPIRATION_TIME: process.env.JWT_EXPIRATION_TIME || '1h',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key-here',
    
    // Validation
    validate() {
        if (!this.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        if (!this.DATABASE_URL) {
            throw new Error('DATABASE_URL is required');
        }
        if (!this.ADMIN_PASSWORD) {
            throw new Error('ADMIN_PASSWORD is required');
        }
        if (this.USE_WEBHOOK) {
            if (!this.WEBHOOK_URL) {
                throw new Error('WEBHOOK_URL is required when USE_WEBHOOK is true');
            }
            if (!this.WEBHOOK_URL.startsWith('https://')) {
                throw new Error('WEBHOOK_URL must start with https:// for security');
            }
        }
    }
};