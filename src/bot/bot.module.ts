// src/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { LanguageScene } from './scenes/language.scene';
import { RoleScene } from './scenes/role.scene';
import { UserRegistrationScene } from './scenes/user-registration.scene';
import { SellerRegistrationScene } from './scenes/seller-registration.scene';
import { ProductCreationScene } from './scenes/product-creation.scene';
import { SessionProvider } from './providers/session.provider';
import { UsersModule } from 'src/users/users.module';
import { SellersModule } from 'src/sellers/sellers.module';
import { ProductsModule } from 'src/products/products.module';
import { OrdersModule } from 'src/orders/orders.module';
import { RatingsModule } from 'src/ratings/ratings.module';
import { envVariables } from 'src/config/env.variables';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: envVariables.TELEGRAM_BOT_TOKEN,
    }),
    UsersModule,
    SellersModule,
    ProductsModule,
    OrdersModule,
    RatingsModule,
  ],
  providers: [
    BotUpdate,
    LanguageScene,
    RoleScene,
    UserRegistrationScene,
    SellerRegistrationScene,
    ProductCreationScene,
    SessionProvider,
  ],
})
export class BotModule {}