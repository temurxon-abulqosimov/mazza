import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { RatingsModule } from './ratings/ratings.module';
import { envVariables } from './config/env.variables';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envVariables.DB_HOST,
      port: envVariables.DB_PORT || 5432,
      username: envVariables.DB_USERNAME,
      password: envVariables.DB_PASSWORD,
      database: envVariables.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: envVariables.NODE_ENV === 'development',
      logging: envVariables.NODE_ENV === 'development',
    }),
    BotModule,
    UsersModule,
    SellersModule,
    ProductsModule,
    OrdersModule,
    RatingsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
