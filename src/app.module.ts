import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { ProductsModule } from './products/products.module';
import { BookingsModule } from './bookings/bookings.module';
import { BotModule } from './bot/bot.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './config/orm.config';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [UsersModule, SellersModule, ProductsModule, BookingsModule, BotModule, TypeOrmModule.forRoot(dataSourceOptions), ConfigModule.forRoot({ isGlobal: true }),],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
