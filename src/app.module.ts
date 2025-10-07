import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { RatingsModule } from './ratings/ratings.module';
import { WebappModule } from './webapp/webapp.module';
import { HealthController } from './health.controller';
import { envVariables } from './config/env.variables';

// Import all entities explicitly
import { User } from './users/entities/user.entity';
import { Seller } from './sellers/entities/seller.entity';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { Rating } from './ratings/entities/rating.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: envVariables.DATABASE_URL,
      entities: [User, Seller, Product, Order, Rating],
      synchronize: envVariables.NODE_ENV !== 'production', // Only sync in development
      logging: envVariables.NODE_ENV === 'development',
      // Connection pooling for high load
      extra: {
        max: 20, // Maximum number of connections in the pool
        min: 5,  // Minimum number of connections in the pool
        acquire: 30000, // Maximum time (ms) to acquire a connection
        idle: 10000, // Maximum time (ms) a connection can be idle
        evict: 60000, // How often (ms) to run eviction checks
        handleDisconnects: true,
      },
      // Performance optimizations
      cache: {
        duration: 30000, // 30 seconds cache
      },
      // SSL configuration for production
      ssl: envVariables.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Retry connection on failure
      retryAttempts: 5,
      retryDelay: 5000,
      // Auto-reconnect
      autoLoadEntities: true,
      // Connection timeout
      connectTimeoutMS: 30000,
      // Graceful connection handling
      keepConnectionAlive: true,
    }),
    // BotModule, // Temporarily disabled to prevent Telegram bot conflicts
    UsersModule,
    SellersModule,
    AdminModule,
    ProductsModule,
    OrdersModule,
    RatingsModule,
    WebappModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
