import * as dotenv from 'dotenv';

dotenv.config();

export const envVariables = {
    PORT: process.env.PORT || 3000,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'admin',
    DB_NAME: process.env.DB_NAME || 'ecommerce',
    JWT_SECRET: process.env.JWT_SECRET || 'secretKey',
    JWT_EXPIRATION_TIME: process.env.JWT_EXPIRATION || '1h',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    
    // Admin Configuration
    ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID || '794464667',
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || '@avtemur',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};

