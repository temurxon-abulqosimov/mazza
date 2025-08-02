// src/bot/scenes/scenes.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { SellersModule } from 'src/sellers/sellers.module';
import { ProductsModule } from 'src/products/products.module';
import { BookingsModule } from 'src/bookings/bookings.module';
import { UserRegistrationWizard } from './user-registration.scene';
import { SellerRegistrationWizard } from './seller-registration.scene';
import { ProductListingWizard } from './product-listing.scene';
import { StoreSearchWizard } from './store-search.scene';

@Module({
  imports: [UsersModule, SellersModule, ProductsModule, BookingsModule],
  providers: [
    UserRegistrationWizard,
    SellerRegistrationWizard,
    ProductListingWizard,
    StoreSearchWizard,
  ],
  exports: [
    UserRegistrationWizard,
    SellerRegistrationWizard,
    ProductListingWizard,
    StoreSearchWizard,
  ],
})
export class BotScenesModule {}