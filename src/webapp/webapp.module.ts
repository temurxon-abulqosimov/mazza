import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ProductsModule } from '../products/products.module';
import { SellersModule } from '../sellers/sellers.module';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';
import { RatingsModule } from '../ratings/ratings.module';
import { AdminModule } from '../admin/admin.module';
import { WebappProductsController } from './controllers/webapp-products.controller';
import { WebappSellersController } from './controllers/webapp-sellers.controller';
import { WebappUsersController } from './controllers/webapp-users.controller';
import { WebappOrdersController } from './controllers/webapp-orders.controller';
import { WebappRatingsController } from './controllers/webapp-ratings.controller';
import { AuthController } from './controllers/auth.controller';
import { WebappUserDashboardController } from './controllers/webapp-user-dashboard.controller';
import { WebappSellerDashboardController } from './controllers/webapp-seller-dashboard.controller';
import { WebappProductDiscoveryController } from './controllers/webapp-product-discovery.controller';
import { WebappOrderManagementController } from './controllers/webapp-order-management.controller';
import { WebappAdminPanelController } from './controllers/webapp-admin-panel.controller';
import { WebappMiniAppController } from './controllers/webapp-mini-app.controller';
import { TelegramWebappAuthGuard } from '../common/guards/telegram-webapp-auth.guard';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from './guard/auth.guard';
import { UserAuthGuard } from './guard/user.guard';
import { SellerAuthGuard } from './guard/seller.guard';
import { AdminAuthGuard } from './guard/admin.guard';
import { AdminOrSellerGuard } from './guard/adminOrSeller.guard';
import { AllAuthGuard } from './guard/all.guard';
import { AdminOrUserGuard } from './guard/userOrAdmin.guard';
import { envVariables } from './config/env.variables';
import { BotService } from '../bot/bot.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      secret: envVariables.JWT_SECRET,
      signOptions: { expiresIn: envVariables.JWT_EXPIRATION_TIME },
    }),
    ProductsModule,
    SellersModule,
    UsersModule,
    OrdersModule,
    RatingsModule,
    AdminModule,
  ],
  controllers: [
    // Original controllers
    WebappProductsController,
    WebappSellersController,
    WebappUsersController,
    WebappOrdersController,
    WebappRatingsController,
    AuthController,
    // New mini-app controllers
    WebappUserDashboardController,
    WebappSellerDashboardController,
    WebappProductDiscoveryController,
    WebappOrderManagementController,
    WebappAdminPanelController,
    WebappMiniAppController,
  ],
  providers: [
    TelegramWebappAuthGuard,
    AuthService,
    JwtAuthGuard,
    UserAuthGuard,
    SellerAuthGuard,
    AdminAuthGuard,
    AdminOrSellerGuard,
    AllAuthGuard,
    AdminOrUserGuard,
    BotService,
  ],
  exports: [AuthService, JwtModule],
})
export class WebappModule {}
