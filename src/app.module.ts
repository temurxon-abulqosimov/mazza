import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { RatingsModule } from './ratings/ratings.module';
import { envVariables } from './config/env.variables';

// Import all entities explicitly
import { User } from './users/entities/user.entity';
import { Seller } from './sellers/entities/seller.entity';
import { Admin } from './admin/entities/admin.entity';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { Rating } from './ratings/entities/rating.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envVariables.DB_HOST,
      port: envVariables.DB_PORT || 5432,
      username: envVariables.DB_USERNAME,
      password: envVariables.DB_PASSWORD,
      database: envVariables.DB_NAME,
      entities: [User, Seller, Admin, Product, Order, Rating],
      synchronize: envVariables.NODE_ENV === 'development',
      logging: envVariables.NODE_ENV === 'development',
    }),
    BotModule,
    UsersModule,
    SellersModule,
    AdminModule,
    ProductsModule,
    OrdersModule,
    RatingsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
