// src/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session, Scenes } from 'telegraf';
import { envVariables } from 'src/config/env.variables';
import { BotContext } from './bot.context';
import { BotScenesModule } from './scenes/scenes.module';
import { UsersModule } from 'src/users/users.module';
import { SellersModule } from 'src/sellers/sellers.module';
import { ProductsModule } from 'src/products/products.module';
import { BookingsModule } from 'src/bookings/bookings.module';
import { UserRegistrationWizard } from './scenes/user-registration.scene';
import { SellerRegistrationWizard } from './scenes/seller-registration.scene';
import { ProductListingWizard } from './scenes/product-listing.scene';
import { StoreSearchWizard } from './scenes/store-search.scene';
import { BotUpdate } from './bot.update';

@Module({
  imports: [
    BotScenesModule,
    UsersModule,
    SellersModule,
    ProductsModule,
    BookingsModule,
    TelegrafModule.forRootAsync({
      imports: [BotScenesModule, UsersModule, SellersModule, ProductsModule, BookingsModule],
      useFactory: (
        userWizard: UserRegistrationWizard,
        sellerWizard: SellerRegistrationWizard,
        productWizard: ProductListingWizard,
        storeWizard: StoreSearchWizard,
      ) => {
        if (!envVariables.TELEGRAM_BOT_TOKEN) {
          throw new Error('TELEGRAM_BOT_TOKEN is not defined');
        }
        const stage = new Scenes.Stage<BotContext>([
          userWizard,
          sellerWizard,
          productWizard,
          storeWizard,
        ]);
        console.log('TelegrafModule initialized with scenes:', [...stage.scenes.keys()]);
        return {
          token: envVariables.TELEGRAM_BOT_TOKEN,
          middlewares: [session(), stage.middleware()],
          options: { handlerTimeout: 90000 },
        };
      },
      inject: [
        UserRegistrationWizard,
        SellerRegistrationWizard,
        ProductListingWizard,
        StoreSearchWizard,
      ],
    }),
  ],
  providers: [BotUpdate, UserRegistrationWizard, SellerRegistrationWizard, ProductListingWizard, StoreSearchWizard],
})
export class BotModule {}