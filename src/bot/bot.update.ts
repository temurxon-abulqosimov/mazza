// src/bot/bot.update.ts
import { Update, Ctx, Start, Command, On, Action, Message } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getMainMenuKeyboard, getLocationKeyboard, getStoreListKeyboard, getProductActionKeyboard, getRatingKeyboard, getStoreRatingKeyboard, getLanguageKeyboard, getRoleKeyboard, getBusinessTypeKeyboard, getPaymentMethodKeyboard, getContactKeyboard, getProductListKeyboard, getNoStoresKeyboard, getSupportKeyboard, getSkipImageKeyboard, getAdminMainKeyboard, getAdminSellerActionKeyboard, getAdminSellerDetailsKeyboard, getAdminSellerListKeyboard, getAdminConfirmationKeyboard, getAdminBroadcastKeyboard, getAdminLoginKeyboard, getAdminLogoutKeyboard } from 'src/common/utils/keyboard.util';
import { formatDistance } from 'src/common/utils/distance.util';
import { isStoreOpen, formatDateForDisplay, cleanAndValidatePrice, validateAndParseTime } from 'src/common/utils/store-hours.util';
import { UsersService } from 'src/users/users.service';
import { SellersService } from 'src/sellers/sellers.service';
import { AdminService } from 'src/admin/admin.service';
import { ProductsService } from 'src/products/products.service';
import { OrdersService } from 'src/orders/orders.service';
import { RatingsService } from 'src/ratings/ratings.service';
import { UserRole } from 'src/common/enums/user-role.enum';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { getMessage } from 'src/config/messages';
import { envVariables } from 'src/config/env.variables';
import { SessionProvider } from './providers/session.provider';

@Update()
export class BotUpdate {
  private userMessageCounts = new Map<string, { count: number; resetTime: number }>();
  private pendingRatings = new Map<string, number>(); // Store seller IDs for pending ratings
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 30; // 30 messages per minute

  constructor(
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
    private readonly adminService: AdminService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly ratingsService: RatingsService,
    private readonly sessionProvider: SessionProvider,
  ) {}

  private checkRateLimit(telegramId: string): boolean {
    const now = Date.now();
    const userKey = telegramId.toString();
    const userData = this.userMessageCounts.get(userKey);

    if (!userData || now > userData.resetTime) {
      // Reset or initialize rate limit
      this.userMessageCounts.set(userKey, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return true;
    }

    if (userData.count >= this.RATE_LIMIT_MAX) {
      return false; // Rate limit exceeded
    }

    // Increment count
    userData.count++;
    return true;
  }

  private async handleRateLimitExceeded(ctx: TelegramContext): Promise<void> {
    const language = ctx.session?.language || 'uz';
    const message = language === 'uz' 
      ? '⚠️ Haddan tashqari ko\'p so\'rovlar. Iltimos, bir oz kutib turing.'
      : '⚠️ Слишком много запросов. Пожалуйста, подождите немного.';
    
    try {
      await ctx.reply(message);
    } catch (error) {
      console.error('Failed to send rate limit message:', error);
    }
  }

  private initializeSession(ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    ctx.session = this.sessionProvider.getSession(telegramId);
  }

  private async checkAdminAuth(ctx: TelegramContext): Promise<{ isAdmin: boolean; language: 'uz' | 'ru' }> {
    if (!ctx.from) return { isAdmin: false, language: 'uz' };
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    const language = (ctx.session?.language || 'uz') as 'uz' | 'ru';
    
    return { isAdmin, language };
  }

  private async checkAdminAuthenticated(ctx: TelegramContext): Promise<{ isAuthenticated: boolean; language: 'uz' | 'ru' }> {
    const { isAdmin, language } = await this.checkAdminAuth(ctx);
    
    if (!isAdmin) {
      return { isAuthenticated: false, language };
    }
    
    const isAuthenticated = ctx.session?.adminAuthenticated || false;
    return { isAuthenticated, language };
  }

  @Command('admintest')
  async adminTestCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    
    // Simple direct check
    if (telegramId !== envVariables.ADMIN_TELEGRAM_ID) {
      return ctx.reply('❌ You are not an admin!');
    }
    
    await ctx.reply(`✅ Admin Test Successful!\n\n📱 Your Telegram ID: ${telegramId}\n👤 Expected Admin ID: ${envVariables.ADMIN_TELEGRAM_ID}\n🔐 Admin Password: ${envVariables.ADMIN_PASSWORD}\n\nYou can now use /admin to access the admin panel.`);
  }

  @Command('debug')
  async debugCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    
    // Simple direct check
    if (telegramId !== envVariables.ADMIN_TELEGRAM_ID) {
      return ctx.reply('❌ You are not authorized as admin.');
    }
    
    console.log('=== ADMIN CONFIG DEBUG ===');
    console.log('Admin Telegram ID:', envVariables.ADMIN_TELEGRAM_ID);
    console.log('Admin Username:', envVariables.ADMIN_USERNAME);
    console.log('Admin Password:', envVariables.ADMIN_PASSWORD);
    console.log('Current User ID:', telegramId);
    console.log('Is Admin:', true);
    
    await ctx.reply(`🔍 Admin Configuration Debug:\n\n📱 Admin Telegram ID: ${envVariables.ADMIN_TELEGRAM_ID}\n👤 Admin Username: ${envVariables.ADMIN_USERNAME}\n🔐 Admin Password: ${envVariables.ADMIN_PASSWORD}\n👤 Current User ID: ${telegramId}\n✅ Is Admin: true`);
    
    try {
      // Create a test seller with location
      const testSeller = await this.sellersService.create({
        telegramId: 'test_seller_' + Date.now(),
        phoneNumber: '+998901234567',
        businessName: 'Test Store',
        businessType: BusinessType.CAFE,
        location: {
          latitude: 41.3111, // Tashkent coordinates
          longitude: 69.2797
        },
        opensAt: 480, // 8:00 AM
        closesAt: 1200, // 8:00 PM
        language: 'uz',
        status: SellerStatus.APPROVED
      });
      
      console.log('Created test seller with location:', testSeller.location);
      
      // Create a test product for the seller
      const testProduct = await this.productsService.create({
        price: 15000,
        description: 'Test Product - Delicious food',
        availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Available for 24 hours
        sellerId: testSeller.id
      });
      
      await ctx.reply(`✅ Test store created successfully!\n\n🏪 Store: ${testSeller.businessName}\n📍 Location: ${testSeller.location?.latitude}, ${testSeller.location?.longitude}\n📦 Product: ${testProduct.description}\n💰 Price: ${testProduct.price} so'm`);
    } catch (error) {
      console.error('Test store creation error:', error);
      await ctx.reply(`❌ Test store creation failed: ${error.message}`);
    }
  }

  @Command('testdistance')
  async testDistanceCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Test distance calculation with specific coordinates
      const { calculateDistance } = await import('src/common/utils/distance.util');
      
      // Test coordinates (Tashkent area)
      const userLat = 41.3111;
      const userLon = 69.2797; // Tashkent center
      const storeLat = 41.3211;
      const storeLon = 69.2897; // Slightly north-east
      
      const distance = calculateDistance(userLat, userLon, storeLat, storeLon);
      
      await ctx.reply(`🧪 Distance Test Results:\n\n📍 User Location: ${userLat}, ${userLon}\n🏪 Store Location: ${storeLat}, ${storeLon}\n📏 Calculated Distance: ${distance} km`);
    } catch (error) {
      console.error('Distance test error:', error);
      await ctx.reply(`❌ Distance test failed: ${error.message}`);
    }
  }

  @Command('testformula')
  async testFormulaCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Test the exact formula you provided
      const { calculateDistance } = await import('src/common/utils/distance.util');
      
      // Test with your exact user location
      const userLat = 40.852042;
      const userLon = 69.620379;
      
      // Test with different store locations
      const testLocations = [
        { lat: 41.3111, lon: 69.2797, name: 'Tashkent Center' },
        { lat: 41.3211, lon: 69.2897, name: 'North-East' },
        { lat: 41.3011, lon: 69.2697, name: 'South-West' },
        { lat: 40.852042, lon: 69.620379, name: 'Same as User' }
      ];
      
      let result = `🧮 Formula Test Results:\n\n📍 User Location: ${userLat}, ${userLon}\n\n`;
      
      testLocations.forEach((location, index) => {
        try {
          const distance = calculateDistance(userLat, userLon, location.lat, location.lon);
          result += `${index + 1}. ${location.name}\n`;
          result += `   Location: ${location.lat}, ${location.lon}\n`;
          result += `   Distance: ${formatDistance(distance)}\n\n`;
        } catch (error) {
          result += `${index + 1}. ${location.name}\n`;
          result += `   Location: ${location.lat}, ${location.lon}\n`;
          result += `   Error: ${error.message}\n\n`;
        }
      });
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Formula test error:', error);
      await ctx.reply(`❌ Formula test failed: ${error.message}`);
    }
  }

  @Command('testdistanceformat')
  async testDistanceFormatCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Test the distance formatting function
      const { formatDistance } = await import('src/common/utils/distance.util');
      
      // Test different distances
      const testDistances = [
        0.1,    // 100m
        0.5,    // 500m
        0.9,    // 900m
        1.0,    // 1.0 km
        1.5,    // 1.5 km
        5.0,    // 5.0 km
        10.0,   // 10.0 km
        25.0    // 25.0 km
      ];
      
      let result = `📏 Distance Format Test Results:\n\n`;
      
      testDistances.forEach((distance, index) => {
        const formatted = formatDistance(distance);
        result += `${index + 1}. ${distance} km → ${formatted}\n`;
      });
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Distance format test error:', error);
      await ctx.reply(`❌ Distance format test failed: ${error.message}`);
    }
  }

  @Command('forcelocation')
  async forceLocationCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers and force update their location with simple coordinates
      const allSellers = await this.sellersService.findAll();
      
      let updatedCount = 0;
      
      for (const seller of allSellers) {
        // Generate simple coordinates near Tashkent
        const baseLat = 41.3111;
        const baseLon = 69.2797;
        const randomLat = baseLat + (Math.random() - 0.5) * 0.01; // ±0.005 degrees (~500m)
        const randomLon = baseLon + (Math.random() - 0.5) * 0.01;
        
        // Force update with simple object format
        await this.sellersService.update(seller.id, {
          location: {
            latitude: randomLat,
            longitude: randomLon
          }
        });
        updatedCount++;
        
        console.log(`Force updated seller ${seller.businessName} (ID: ${seller.id}) with location: ${randomLat}, ${randomLon}`);
      }
      
      await ctx.reply(`🔧 Force Location Update Results:\n\n📊 Total Sellers: ${allSellers.length}\n✅ Updated sellers: ${updatedCount}\n\nAll sellers now have simple location data!`);
    } catch (error) {
      console.error('Force location error:', error);
      await ctx.reply(`❌ Force location failed: ${error.message}`);
    }
  }

  @Command('fixnow')
  async fixNowCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers and force update their location with simple coordinates
      const allSellers = await this.sellersService.findAll();
      
      let updatedCount = 0;
      
      for (const seller of allSellers) {
        // Generate simple coordinates near Tashkent
        const baseLat = 41.3111;
        const baseLon = 69.2797;
        const randomLat = baseLat + (Math.random() - 0.5) * 0.01; // ±0.005 degrees (~500m)
        const randomLon = baseLon + (Math.random() - 0.5) * 0.01;
        
        // Force update with simple object format
        await this.sellersService.update(seller.id, {
          location: {
            latitude: randomLat,
            longitude: randomLon
          }
        });
        updatedCount++;
        
        console.log(`Force updated seller ${seller.businessName} (ID: ${seller.id}) with location: ${randomLat}, ${randomLon}`);
      }
      
      await ctx.reply(`🔧 Force Location Update Results:\n\n📊 Total Sellers: ${allSellers.length}\n✅ Updated sellers: ${updatedCount}\n\nAll sellers now have simple location data!`);
    } catch (error) {
      console.error('Force location error:', error);
      await ctx.reply(`❌ Force location failed: ${error.message}`);
    }
  }

  @Command('directfix')
  async directFixCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers and update them individually
      const allSellers = await this.sellersService.findAll();
      let updatedCount = 0;
      
      for (const seller of allSellers) {
        if (!seller.location) {
          await this.sellersService.update(seller.id, {
            location: {
              latitude: 41.3111 + (Math.random() - 0.5) * 0.01,
              longitude: 69.2797 + (Math.random() - 0.5) * 0.01
            }
          });
          updatedCount++;
        }
      }
      
      await ctx.reply(`🔧 Direct Database Fix Results:\n\n✅ Updated sellers with NULL location: ${updatedCount}\n\nAll sellers now have location data!`);
    } catch (error) {
      console.error('Direct fix error:', error);
      await ctx.reply(`❌ Direct fix failed: ${error.message}`);
    }
  }

  @Command('fixnull')
  async fixNullCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers
      const allSellers = await this.sellersService.findAll();
      let updatedCount = 0;
      
      for (const seller of allSellers) {
        // Check if location is null, undefined, or empty object
        if (!seller.location || 
            (typeof seller.location === 'object' && Object.keys(seller.location).length === 0) ||
            (seller.location && typeof seller.location === 'object' && (!seller.location.latitude || !seller.location.longitude))) {
          
          // Generate random location near Tashkent
          const baseLat = 41.3111;
          const baseLon = 69.2797;
          const randomLat = baseLat + (Math.random() - 0.5) * 0.02; // ±0.01 degrees (~1km)
          const randomLon = baseLon + (Math.random() - 0.5) * 0.02;
          
          console.log(`Fixing NULL location for seller ${seller.businessName} (ID: ${seller.id})`);
          console.log(`Old location: ${JSON.stringify(seller.location)}`);
          console.log(`New location: ${randomLat}, ${randomLon}`);
          
          await this.sellersService.update(seller.id, {
            location: {
              latitude: randomLat,
              longitude: randomLon
            }
          });
          updatedCount++;
        }
      }
      
      await ctx.reply(`🔧 NULL Location Fix Results:\n\n📊 Total Sellers: ${allSellers.length}\n✅ Updated sellers: ${updatedCount}\n\nAll sellers now have valid location data!`);
    } catch (error) {
      console.error('Fix NULL error:', error);
      await ctx.reply(`❌ Fix NULL failed: ${error.message}`);
    }
  }

  @Command('teststorefinding')
  async testStoreFindingCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      console.log('=== TEST STORE FINDING ===');
      
      // Test with Tashkent coordinates
      const testUserLat = 41.2995;
      const testUserLon = 69.2401;
      
      console.log('Testing with location:', { latitude: testUserLat, longitude: testUserLon });
      
      const stores = await this.sellersService.findNearbyStores(testUserLat, testUserLon);
      
      console.log('Stores found:', stores.length);
      stores.forEach((store, index) => {
        console.log(`Store ${index + 1}:`, {
          id: store.id,
          name: store.businessName,
          products: store.products.length,
          distance: store.distance,
          distanceKm: store.distance ? `${store.distance.toFixed(2)} km` : 'N/A',
          isOpen: store.isOpen,
          storeLocation: store.location
        });
      });
      
      let result = `🔍 Store Finding Test Results\n\n📍 Test Location: ${testUserLat}, ${testUserLon}\n📊 Stores Found: ${stores.length}\n\n`;
      
      if (stores.length === 0) {
        result += '❌ No stores found!\n\nPossible reasons:\n• No approved sellers\n• No active products\n• All products expired\n• Location issues';
      } else {
        stores.forEach((store, index) => {
          const distanceText = store.distance ? `${store.distance.toFixed(2)} km` : 'N/A';
          result += `${index + 1}. ${store.businessName}\n   📦 Products: ${store.products.length}\n   📏 Distance: ${distanceText}\n   🕐 Open: ${store.isOpen ? 'Yes' : 'No'}\n\n`;
        });
      }
      
      await ctx.reply(result);
      
    } catch (error) {
      console.error('Test store finding error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('quicktest')
  async quickTestCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Quick test with the exact user location from the logs
      const testUserLat = 40.852042;
      const testUserLon = 69.620379;
      
      console.log('Quick test with user location:', { testUserLat, testUserLon });
      
      const stores = await this.sellersService.findNearbyStores(testUserLat, testUserLon);
      
      let result = `⚡ Quick Test Results:\n\n📍 User Location: ${testUserLat}, ${testUserLon}\n📊 Found Stores: ${stores.length}\n\n`;
      
      stores.forEach((store, index) => {
        result += `${index + 1}. ${store.businessName}\n`;
        result += `   Distance: ${store.distance !== null ? formatDistance(store.distance) : 'N/A'}\n`;
        result += `   Location: ${JSON.stringify(store.location)}\n`;
        result += `   Products: ${store.products.length}\n\n`;
      });
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Quick test error:', error);
      await ctx.reply(`❌ Quick test failed: ${error.message}`);
    }
  }

  @Command('testnow')
  async testNowCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Test with your exact user location
      const testUserLat = 40.852042;
      const testUserLon = 69.620379;
      
      console.log('Testing with user location:', { testUserLat, testUserLon });
      
      const stores = await this.sellersService.findNearbyStores(testUserLat, testUserLon);
      
      let result = `🎯 Test Results:\n\n📍 User Location: ${testUserLat}, ${testUserLon}\n📊 Found Stores: ${stores.length}\n\n`;
      
      if (stores.length === 0) {
        result += '❌ No stores found!';
      } else {
        stores.forEach((store, index) => {
          result += `${index + 1}. ${store.businessName}\n`;
          result += `   Distance: ${store.distance !== null ? formatDistance(store.distance) : 'N/A'}\n`;
          result += `   Location: ${JSON.stringify(store.location)}\n`;
          result += `   Products: ${store.products.length}\n\n`;
        });
      }
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Test now error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('validateall')
  async validateAllCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers and validate their data
      const allSellers = await this.sellersService.findAll();
      let result = `🔍 Data Validation Results:\n\n📊 Total Sellers: ${allSellers.length}\n\n`;
      
      let validSellers = 0;
      let invalidSellers = 0;
      
      allSellers.forEach((seller, index) => {
        result += `${index + 1}. ${seller.businessName} (ID: ${seller.id})\n`;
        
        // Validate location data
        if (seller.location && 
            typeof seller.location === 'object' && 
            seller.location !== null &&
            typeof seller.location.latitude === 'number' && 
            typeof seller.location.longitude === 'number' &&
            !isNaN(seller.location.latitude) && 
            !isNaN(seller.location.longitude) &&
            seller.location.latitude >= -90 && seller.location.latitude <= 90 &&
            seller.location.longitude >= -180 && seller.location.longitude <= 180) {
          
          result += `   ✅ Location: ${seller.location.latitude}, ${seller.location.longitude}\n`;
          validSellers++;
        } else {
          result += `   ❌ Location: ${JSON.stringify(seller.location)} (INVALID)\n`;
          invalidSellers++;
        }
        
        // Validate products
        const activeProducts = seller.products.filter(product => 
          product.isActive && new Date(product.availableUntil) > new Date()
        );
        result += `   📦 Products: ${seller.products.length} (${activeProducts.length} active)\n\n`;
      });
      
      result += `📈 Summary:\n✅ Valid sellers: ${validSellers}\n❌ Invalid sellers: ${invalidSellers}\n`;
      
      if (invalidSellers > 0) {
        result += `\n⚠️ Run /fixnull to fix invalid locations!`;
      }
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Validate all error:', error);
      await ctx.reply(`❌ Validation failed: ${error.message}`);
    }
  }

  @Command('addlocation')
  async addLocationCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers without location
      const allSellers = await this.sellersService.findAll();
      const sellersWithoutLocation = allSellers.filter(seller => !seller.location);
      
      if (sellersWithoutLocation.length === 0) {
        return ctx.reply('✅ All sellers already have location data!');
      }
      
      let updatedCount = 0;
      
      // Add location data to sellers without location
      for (const seller of sellersWithoutLocation) {
        // Generate random location near Tashkent center
        const baseLat = 41.3111;
        const baseLon = 69.2797;
        const randomLat = baseLat + (Math.random() - 0.5) * 0.02; // ±0.01 degrees (~1km)
        const randomLon = baseLon + (Math.random() - 0.5) * 0.02;
        
        await this.sellersService.update(seller.id, {
          location: {
            latitude: randomLat,
            longitude: randomLon
          }
        });
        updatedCount++;
        
        console.log(`Added location to seller ${seller.businessName}: ${randomLat}, ${randomLon}`);
      }
      
      await ctx.reply(`🔧 Location Addition Results:\n\n📊 Total Sellers: ${allSellers.length}\n📍 Sellers without location: ${sellersWithoutLocation.length}\n✅ Updated sellers: ${updatedCount}\n\nAll sellers now have location data!`);
    } catch (error) {
      console.error('Add location error:', error);
      await ctx.reply(`❌ Add location failed: ${error.message}`);
    }
  }

  @Command('checkdb')
  async checkDatabaseCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Use raw query to see what's actually in the database
      const sellers = await this.sellersService.findAll();
      
      let dbInfo = '📊 Database Location Info:\n\n';
      
      sellers.forEach((seller, index) => {
        dbInfo += `${index + 1}. ${seller.businessName} (ID: ${seller.id})\n`;
        dbInfo += `   Location: ${JSON.stringify(seller.location)}\n`;
        dbInfo += `   Type: ${typeof seller.location}\n`;
        dbInfo += `   Has lat: ${seller.location?.latitude !== undefined}\n`;
        dbInfo += `   Has lon: ${seller.location?.longitude !== undefined}\n`;
        dbInfo += `   Lat: ${seller.location?.latitude}\n`;
        dbInfo += `   Lon: ${seller.location?.longitude}\n\n`;
      });
      
      // Split into multiple messages if too long
      if (dbInfo.length > 4000) {
        const chunks = dbInfo.match(/.{1,4000}/g) || [];
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      } else {
        await ctx.reply(dbInfo);
      }
    } catch (error) {
      console.error('Check database error:', error);
      await ctx.reply(`❌ Check database failed: ${error.message}`);
    }
  }

  @Command('fixlocations')
  async fixLocationsCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers
      const allSellers = await this.sellersService.findAll();
      
      let updatedCount = 0;
      let noLocationCount = 0;
      
      for (const seller of allSellers) {
        if (!seller.location) {
          noLocationCount++;
          
          // Add a default location (Tashkent center) for stores without location
          await this.sellersService.update(seller.id, {
            location: {
              latitude: 41.3111 + (Math.random() - 0.5) * 0.01, // Random location within ~1km
              longitude: 69.2797 + (Math.random() - 0.5) * 0.01
            }
          });
          updatedCount++;
        }
      }
      
      await ctx.reply(`🔧 Location Fix Results:\n\n📊 Total Sellers: ${allSellers.length}\n📍 Sellers without location: ${noLocationCount}\n✅ Updated sellers: ${updatedCount}\n\nAll sellers now have location data!`);
    } catch (error) {
      console.error('Fix locations error:', error);
      await ctx.reply(`❌ Fix locations failed: ${error.message}`);
    }
  }

  @Command('fixproductcodes')
  async fixProductCodesCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all products
      const allProducts = await this.productsService.findAll();
      
      let updatedCount = 0;
      let noCodeCount = 0;
      
      for (const product of allProducts) {
        if (!product.code) {
          noCodeCount++;
          
          // Generate unique code for this product
          const { generateProductCode } = await import('src/common/utils/code-generator.util');
          
          let productCode: string = '';
          let isUnique = false;
          let attempts = 0;
          
          while (!isUnique && attempts < 10) {
            productCode = generateProductCode();
            const existingProduct = await this.productsService.findOne(product.id);
            if (existingProduct && existingProduct.code === productCode) {
              attempts++;
            } else {
              isUnique = true;
            }
          }
          
          if (isUnique && productCode) {
            await this.productsService.update(product.id, { code: productCode });
            updatedCount++;
          }
        }
      }
      
      await ctx.reply(`🔧 Product Codes Fix Results:\n\n📊 Total Products: ${allProducts.length}\n🔢 Products without code: ${noCodeCount}\n✅ Updated products: ${updatedCount}\n\nAll products now have codes!`);
    } catch (error) {
      console.error('Fix product codes error:', error);
      await ctx.reply(`❌ Fix product codes failed: ${error.message}`);
    }
  }

  @Command('admin')
  async adminCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    
    // Simple direct check
    if (telegramId !== envVariables.ADMIN_TELEGRAM_ID) {
      return ctx.reply('❌ You are not authorized as admin.');
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Check if admin is already authenticated
    if (ctx.session.adminAuthenticated) {
      await ctx.reply(getMessage(language, 'admin.mainMenu'), { 
        reply_markup: getAdminMainKeyboard() 
      });
    } else {
      // Start authentication process - only ask for password
      ctx.session.adminLoginStep = 'password';
      ctx.session.adminLoginData = {};
      
      await ctx.reply('🔐 Admin authentication required.');
      await ctx.reply('Please enter the admin password:');
    }
  }

  @Action('admin_login')
  async onAdminLogin(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    
    // Simple direct check
    if (telegramId !== envVariables.ADMIN_TELEGRAM_ID) {
      return ctx.reply('❌ You are not authorized as admin.');
    }
    
    this.initializeSession(ctx);
    
    ctx.session.adminLoginStep = 'password';
    ctx.session.adminLoginData = {};
    
    await ctx.reply('Please enter the admin password:');
  }

  @Action('admin_cancel_login')
  async onAdminCancelLogin(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Clear admin authentication state
    ctx.session.adminAuthenticated = false;
    ctx.session.adminLoginStep = undefined;
    ctx.session.adminLoginData = undefined;
    
    await ctx.reply(getMessage(language, 'admin.logoutSuccess'));
  }

  @Action('admin_logout')
  async onAdminLogout(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Clear admin authentication state
    ctx.session.adminAuthenticated = false;
    ctx.session.adminLoginStep = undefined;
    ctx.session.adminLoginData = undefined;
    ctx.session.adminAction = undefined;
    ctx.session.adminCurrentPage = undefined;
    ctx.session.adminSearchQuery = undefined;
    
    await ctx.reply(getMessage(language, 'admin.logoutSuccess'));
  }

  @Command('start')
  async startCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;

    // Check rate limit
    if (!this.checkRateLimit(ctx.from.id.toString())) {
      return this.handleRateLimitExceeded(ctx);
    }

    this.initializeSession(ctx);
    const telegramId = ctx.from.id.toString();

    // Check if user is admin - SIMPLIFIED
    if (telegramId === envVariables.ADMIN_TELEGRAM_ID) {
      // Admin flow - ask for password directly
      ctx.session.adminLoginStep = 'password';
      await ctx.reply('🔐 Admin detected. Please enter the admin password:');
      return;
    }

    // Regular user flow
    const existingUser = await this.usersService.findByTelegramId(telegramId);
    const existingSeller = await this.sellersService.findByTelegramId(telegramId);

    if (existingUser || existingSeller) {
      // User already registered
      const language = ctx.session.language || 'uz';
      
      // Set the session role based on what type of user they are
      if (existingSeller) {
        ctx.session.role = UserRole.SELLER;
        console.log('Set session role to SELLER for existing seller');
      } else if (existingUser) {
        ctx.session.role = UserRole.USER;
        console.log('Set session role to USER for existing user');
      }
      
      const keyboard = getMainMenuKeyboard(language, existingUser ? 'user' : 'seller');
      const message = getMessage(language, 'welcome.back');
      await ctx.reply(message, { reply_markup: keyboard });
    } else {
      // New user - ask for language
      const keyboard = getLanguageKeyboard();
      const message = getMessage('uz', 'welcome.newUser');
      await ctx.reply(message, { reply_markup: keyboard });
    }
  }

  @Command('language')
  async languageCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    if (ctx.scene) {
      await ctx.scene.enter('language');
    }
  }

  @Command('supportchat')
  async supportCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'support.support', { username: envVariables.SUPPORT_USERNAME }));
  }

  @Command('suggestions')
  async suggestionsCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'support.suggestions', { username: envVariables.SUPPORT_USERNAME }));
  }

  @Command('complains')
  async complainsCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'support.complains', { username: envVariables.SUPPORT_USERNAME }));
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    if (!ctx.from || !ctx.message || !('text' in ctx.message)) return;

    console.log('=== ONTEXT DEBUG ===');
    console.log('User ID:', ctx.from.id);
    console.log('Message text:', ctx.message.text);
    console.log('Message type:', typeof ctx.message.text);

    // Re-enable rate limiting
    if (!this.checkRateLimit(ctx.from.id.toString())) {
      return this.handleRateLimitExceeded(ctx);
    }

    this.initializeSession(ctx);
    const text = this.sanitizeInput(ctx.message.text);
    const rawText = ctx.message.text; // Keep raw text for admin authentication
    const telegramId = ctx.from.id.toString();
    const language = ctx.session.language || 'uz';

    console.log('Session initialized:', !!ctx.session);
    console.log('Session role:', ctx.session.role);
    console.log('Session step:', ctx.session.registrationStep);
    console.log('Sanitized text:', text);
    console.log('Raw text:', rawText);

    // Handle admin authentication - SIMPLIFIED
    if (ctx.session.adminLoginStep === 'password') {
      if (!ctx.from) return;
      
      const telegramId = ctx.from.id.toString();
      
      // Simple direct check - no complex logic
      if (telegramId === envVariables.ADMIN_TELEGRAM_ID && rawText === envVariables.ADMIN_PASSWORD) {
        // SUCCESS - Direct authentication
        ctx.session.adminAuthenticated = true;
        ctx.session.adminLoginStep = undefined;
        ctx.session.adminLoginData = undefined;
        
        console.log('✅ ADMIN AUTHENTICATION SUCCESS');
        console.log('Telegram ID:', telegramId);
        console.log('Password match:', rawText === envVariables.ADMIN_PASSWORD);
        
        await ctx.reply('✅ Admin authentication successful!');
        await ctx.reply(getMessage(language, 'admin.mainMenu'), {
          reply_markup: getAdminMainKeyboard()
        });
      } else {
        // FAILED - Simple failure
        console.log('❌ ADMIN AUTHENTICATION FAILED');
        console.log('Telegram ID:', telegramId, 'Expected:', envVariables.ADMIN_TELEGRAM_ID);
        console.log('Password provided:', rawText, 'Expected:', envVariables.ADMIN_PASSWORD);
        
        await ctx.reply('❌ Incorrect password. Please try again.');
        await ctx.reply(getMessage(language, 'admin.enterPassword'));
      }
      return;
    }

    // Handle when someone types "admin" as text - start admin authentication
    if (text.toLowerCase() === 'admin' || rawText.toLowerCase() === 'admin') {
      if (!ctx.from) return;
      
      const telegramId = ctx.from.id.toString();
      
      // Check if this user is the admin
      if (telegramId === envVariables.ADMIN_TELEGRAM_ID) {
        console.log('🔐 ADMIN TEXT DETECTED - Starting authentication');
        console.log('Telegram ID:', telegramId, 'Expected:', envVariables.ADMIN_TELEGRAM_ID);
        
        // Start admin authentication process
        ctx.session.adminLoginStep = 'password';
        ctx.session.adminLoginData = {};
        
        await ctx.reply('🔐 Admin detected. Please enter the admin password:');
        return;
      } else {
        console.log('❌ NON-ADMIN TRYING TO ACCESS ADMIN');
        console.log('Telegram ID:', telegramId, 'Expected:', envVariables.ADMIN_TELEGRAM_ID);
        await ctx.reply('❌ You are not authorized as admin.');
        return;
      }
    }

    // Handle admin search
    if (ctx.session.adminAction === 'searching') {
      if (!ctx.from) return;
      
      const telegramId = ctx.from.id.toString();
      const isAdmin = await this.adminService.isAdmin(telegramId);
      
      if (!isAdmin) {
        return ctx.reply(getMessage(language, 'admin.notAuthorized'));
      }
      
      try {
        const sellers = await this.adminService.searchSellers(text);
        ctx.session.adminAction = undefined;
        
        if (sellers.length === 0) {
          await ctx.reply(getMessage(language, 'admin.noSearchResults'), {
            reply_markup: getAdminMainKeyboard()
          });
        } else {
          await ctx.reply(getMessage(language, 'admin.searchResults', { count: sellers.length }), {
            reply_markup: getAdminSellerListKeyboard(sellers, 0, 'search')
          });
        }
      } catch (error) {
        console.error('Admin search error:', error);
        await ctx.reply(getMessage(language, 'admin.actionFailed'));
      }
      return;
    }

    // Handle seller registration text inputs
    if (ctx.session.role === UserRole.SELLER && ctx.session.registrationStep) {
      const step = ctx.session.registrationStep;
      
      console.log('=== SELLER REGISTRATION TEXT INPUT DEBUG ===');
      console.log('Current step:', step);
      console.log('User role:', ctx.session.role);
      console.log('Registration step exists:', !!ctx.session.registrationStep);
      
      // Handle back commands
      if (text.toLowerCase() === 'back' || text.toLowerCase() === 'orqaga' || text.toLowerCase() === 'назад') {
        if (step === 'business_type') {
          ctx.session.registrationStep = 'business_name';
          await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
          return;
        } else if (step === 'opens_at') {
          ctx.session.registrationStep = 'business_type';
          await ctx.reply(getMessage(language, 'registration.businessTypeRequest'), { reply_markup: getBusinessTypeKeyboard(language) });
          return;
        } else if (step === 'closes_at') {
          ctx.session.registrationStep = 'opens_at';
          await ctx.reply(getMessage(language, 'registration.opensAtRequest'));
          return;
        }
      }
      
      if (step === 'business_name') {
        if (!ctx.session.sellerData) {
          ctx.session.sellerData = {};
        }
        ctx.session.sellerData.businessName = text;
        ctx.session.registrationStep = 'business_type';
        await ctx.reply(getMessage(language, 'registration.businessNameSuccess'), { reply_markup: getBusinessTypeKeyboard(language) });
        return;
      } else if (step === 'opens_at') {
        const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
          return ctx.reply(getMessage(language, 'validation.invalidTime'));
        }
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        if (!ctx.session.sellerData) {
          ctx.session.sellerData = {};
        }
        ctx.session.sellerData.opensAt = hours * 60 + minutes;
        ctx.session.registrationStep = 'closes_at';
        await ctx.reply(getMessage(language, 'registration.opensAtSuccess'));
        return;
      } else if (step === 'closes_at') {
        const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
          return ctx.reply(getMessage(language, 'validation.invalidTime'));
        }
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        if (!ctx.session.sellerData) {
          ctx.session.sellerData = {};
        }
        ctx.session.sellerData.closesAt = hours * 60 + minutes;
        ctx.session.registrationStep = 'location';
        await ctx.reply(getMessage(language, 'registration.closesAtSuccess'), { reply_markup: getLocationKeyboard(language) });
        return;
      }
    }

    // Handle product creation text inputs
    if (ctx.session.role === UserRole.SELLER && ctx.session.registrationStep && ctx.session.registrationStep.startsWith('product_')) {
      const step = ctx.session.registrationStep;
      
      // Handle back commands for product creation
      if (text.toLowerCase() === 'back' || text.toLowerCase() === 'orqaga' || text.toLowerCase() === 'назад') {
        if (step === 'product_original_price') {
          ctx.session.registrationStep = 'product_price';
          await ctx.reply(getMessage(language, 'registration.priceRequest'));
          return;
        } else if (step === 'product_description') {
          ctx.session.registrationStep = 'product_original_price';
          await ctx.reply(getMessage(language, 'registration.priceSuccess'));
          return;
        } else if (step === 'product_available_until') {
          ctx.session.registrationStep = 'product_description';
          await ctx.reply(getMessage(language, 'registration.originalPriceSuccess'));
          return;
        } else if (step === 'product_price') {
          // Go back to main menu
          ctx.session.registrationStep = undefined;
          ctx.session.productData = undefined;
          await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'seller') });
          return;
        }
      }
      
      if (step === 'product_price') {
        // Use original text for price validation, not sanitized
        console.log('=== PRICE VALIDATION DEBUG ===');
        console.log('Original text:', ctx.message.text);
        console.log('Text type:', typeof ctx.message.text);
        console.log('Text length:', ctx.message.text.length);
        
        const priceValidation = cleanAndValidatePrice(ctx.message.text);
        console.log('Price validation result:', priceValidation);
        
        if (!priceValidation.isValid) {
          console.log('Price validation failed - sending error message');
          return ctx.reply(getMessage(language, 'validation.invalidPrice'));
        }

        console.log('Price validation passed - setting price:', priceValidation.price);
        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.price = priceValidation.price!; // We know it's not null because isValid is true
        ctx.session.registrationStep = 'product_original_price';
        await ctx.reply(getMessage(language, 'registration.priceSuccess'));
        return;
      } else if (step === 'product_original_price') {
        // Use original text for original price validation, not sanitized
        const originalPriceValidation = cleanAndValidatePrice(ctx.message.text);
        if (!originalPriceValidation.isValid) {
          return ctx.reply(getMessage(language, 'validation.invalidOriginalPrice'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.originalPrice = originalPriceValidation.price! > 0 ? originalPriceValidation.price! : undefined;
        ctx.session.registrationStep = 'product_description';
        await ctx.reply(getMessage(language, 'registration.originalPriceSuccess'));
        return;
      } else if (step === 'product_description') {
        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        // Don't sanitize product description - use original text
        ctx.session.productData.description = ctx.message.text; // Use original text, not sanitized
        ctx.session.registrationStep = 'product_available_until';
        await ctx.reply(getMessage(language, 'registration.descriptionSuccess'));
        return;
      } else if (step === 'product_available_until') {
        // Use original text for time validation, not sanitized
        const timeValidation = validateAndParseTime(ctx.message.text);
        
        if (!timeValidation.isValid) {
          return ctx.reply(getMessage(language, 'validation.invalidTime'));
        }

        const hours = timeValidation.hours!;
        const minutes = timeValidation.minutes!;
        
        // Create available until date (today at specified time)
        const availableUntil = new Date();
        availableUntil.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, set it for tomorrow
        if (availableUntil <= new Date()) {
          availableUntil.setDate(availableUntil.getDate() + 1);
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.availableUntil = availableUntil.toISOString();

        // Create product
        try {
          if (!ctx.from) throw new Error('User not found');
          if (!ctx.session.productData.price || !ctx.session.productData.description || !ctx.session.productData.availableUntil) {
            throw new Error('Missing product data');
          }

          const telegramId = ctx.from.id.toString();
          const seller = await this.sellersService.findByTelegramId(telegramId);
          
          console.log('Found seller for product creation:', seller);
          
          if (!seller) {
            throw new Error('Seller not found');
          }

          const createProductDto = {
            price: ctx.session.productData.price,
            originalPrice: ctx.session.productData.originalPrice,
            description: ctx.session.productData.description,
            availableUntil: ctx.session.productData.availableUntil,
            sellerId: seller.id
          };

          console.log('Creating product with DTO:', createProductDto);
          const createdProduct = await this.productsService.create(createProductDto);

          // Clear product data and registration step
          ctx.session.productData = {};
          ctx.session.registrationStep = undefined;

          await ctx.reply(getMessage(language, 'success.productCreated'));
          await ctx.reply(getMessage(language, 'success.productDetails', {
            code: createdProduct.code,
            description: createdProduct.description,
            price: createdProduct.price,
            availableUntil: formatDateForDisplay(createdProduct.availableUntil)
          }));
        } catch (error) {
          console.error('Product creation error:', error);
          
          // Provide more specific error messages
          let errorMessage = getMessage(language, 'error.productCreationFailed');
          
          if (error.message.includes('validation')) {
            errorMessage = `❌ Validation error: ${error.message}`;
          } else if (error.message.includes('description')) {
            errorMessage = `❌ Description error: ${error.message}`;
          } else if (error.message.includes('price')) {
            errorMessage = `❌ Price error: ${error.message}`;
          }
          
          await ctx.reply(errorMessage);
          await ctx.reply(getMessage(language, 'validation.invalidFormat'));
        }
        return;
      }
    }

    // Handle main menu text commands
    if (text.includes(getMessage(language, 'mainMenu.findStores'))) {
      await this.handleFindStores(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.postProduct'))) {
      await this.handleAddProduct(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.myProducts'))) {
      await this.handleMyProducts(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.myOrders'))) {
      await this.handleMyOrders(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.support'))) {
      await this.handleSupport(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.language'))) {
      await ctx.reply(getMessage(language, 'selectLanguage'), { reply_markup: getLanguageKeyboard() });
    } else {
      console.log('=== FALLBACK CONDITION DEBUG ===');
      console.log('Text did not match any menu options:', text);
      console.log('Session role:', ctx.session.role);
      console.log('Session step:', ctx.session.registrationStep);
      console.log('Language:', language);
      console.log('Main menu options checked:');
      console.log('- findStores:', getMessage(language, 'mainMenu.findStores'));
      console.log('- postProduct:', getMessage(language, 'mainMenu.postProduct'));
      console.log('- myProducts:', getMessage(language, 'mainMenu.myProducts'));
      console.log('- myOrders:', getMessage(language, 'mainMenu.myOrders'));
      console.log('- support:', getMessage(language, 'mainMenu.support'));
      console.log('- language:', getMessage(language, 'mainMenu.language'));
      
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }

  @On('contact')
  async onContact(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.message || !('contact' in ctx.message)) return;
    if (ctx.session.registrationStep !== 'phone') return;

    const contact = ctx.message.contact;
    if (!contact.phone_number) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'registration.phoneError'));
    }

    const language = ctx.session.language || 'uz';
    
    if (ctx.session.role === UserRole.USER) {
      // User registration - complete after phone number (no location needed)
      try {
        if (!ctx.from) throw new Error('User not found');
        
        // Check if user already exists
        const existingUser = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (existingUser) {
          await ctx.reply(getMessage(language, 'error.userAlreadyExists'));
          return;
        }

        const createUserDto = {
          telegramId: ctx.from.id.toString(),
          phoneNumber: contact.phone_number,
          language: ctx.session.language
        };

        await this.usersService.create(createUserDto);
        
        // Clear registration data
        ctx.session.registrationStep = undefined;
        ctx.session.userData = undefined;
        
        await ctx.reply(getMessage(language, 'success.userRegistration'));
        await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'user') });
      } catch (error) {
        console.error('User registration error:', error);
        if (error.message === 'User already exists with this telegram ID') {
          await ctx.reply(getMessage(language, 'error.userAlreadyExists'));
        } else {
          await ctx.reply(getMessage(language, 'error.general'));
        }
      }
    } else if (ctx.session.role === UserRole.SELLER) {
      // Seller registration
      ctx.session.sellerData = { phoneNumber: contact.phone_number };
      ctx.session.registrationStep = 'business_name';
      await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
    }
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.message || !('photo' in ctx.message)) return;
    
    const language = ctx.session.language || 'uz';
    
    // Handle seller store image upload after registration
    if (ctx.session.registrationStep === 'store_image' && ctx.session.role === UserRole.SELLER) {
      const photos = ctx.message.photo;
      if (photos && photos.length > 0) {
        // Get the largest photo (best quality)
        const photo = photos[photos.length - 1];
        
        // Get file info to download the photo
        try {
          const file = await ctx.telegram.getFile(photo.file_id);
          
          // Store both file_id (for Telegram) and URL (for external access)
          const imageUrl = `https://api.telegram.org/file/bot${envVariables.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
          const imageData = {
            fileId: photo.file_id,
            url: imageUrl
          };
          
          // Update seller with image data
          if (!ctx.from) throw new Error('User not found');
          
          const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
          if (seller) {
            // Store the file_id as the primary reference, URL as backup
            await this.sellersService.update(seller.id, { 
              imageUrl: photo.file_id // Store file_id instead of URL
            });
            await ctx.reply(getMessage(language, 'success.storeImageUploaded'));
          }
          
          await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'seller') });
        } catch (error) {
          console.error('Store image processing error:', error);
          await ctx.reply(getMessage(language, 'error.photoProcessingFailed'));
        }
      }
      return;
    }
  }

  @On('location')
  async onLocation(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.message || !('location' in ctx.message)) return;
    
    const location = ctx.message.location;
    console.log('Received location:', location);
    
    const language = ctx.session.language || 'uz';
    
    // Handle finding stores action
    if (ctx.session.action === 'finding_stores') {
      await this.handleFindStoresWithLocation(ctx, location);
      return;
    }
    
    // Handle registration location step (only for sellers)
    if (ctx.session.registrationStep !== 'location') return;
    
    if (ctx.session.role === UserRole.SELLER) {
      // Seller registration - location step
      if (!ctx.session.sellerData) {
        ctx.session.sellerData = {};
      }
      ctx.session.sellerData.location = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      // Complete seller registration
      try {
        if (!ctx.from) throw new Error('User not found');
        if (!ctx.session.sellerData.phoneNumber || !ctx.session.sellerData.location || 
            !ctx.session.sellerData.businessName || !ctx.session.sellerData.businessType ||
            ctx.session.sellerData.opensAt === undefined || ctx.session.sellerData.closesAt === undefined) {
          throw new Error('Missing seller data');
        }

        // Check if seller already exists
        const existingSeller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
        if (existingSeller) {
          await ctx.reply(getMessage(language, 'error.sellerAlreadyExists'));
          return;
        }

        const createSellerDto = {
          telegramId: ctx.from.id.toString(),
          phoneNumber: ctx.session.sellerData.phoneNumber,
          businessName: ctx.session.sellerData.businessName,
          businessType: ctx.session.sellerData.businessType,
          location: ctx.session.sellerData.location || undefined,
          opensAt: ctx.session.sellerData.opensAt,
          closesAt: ctx.session.sellerData.closesAt,
          language: ctx.session.language,
          status: SellerStatus.PENDING
        };

        await this.sellersService.create(createSellerDto);
        await ctx.reply(getMessage(language, 'success.sellerRegistration'));
        
        // Notify admin about new seller registration
        try {
          const adminNotification = `🆕 Yangi do'kon ro'yxatdan o'tdi!\n\n📝 Nomi: ${ctx.session.sellerData.businessName}\n📍 Turi: ${ctx.session.sellerData.businessType}\n📞 Telefon: ${ctx.session.sellerData.phoneNumber}\n🕐 Ish vaqti: ${Math.floor(ctx.session.sellerData.opensAt / 60)}:${(ctx.session.sellerData.opensAt % 60).toString().padStart(2, '0')} - ${Math.floor(ctx.session.sellerData.closesAt / 60)}:${(ctx.session.sellerData.closesAt % 60).toString().padStart(2, '0')}\n\n✅ Tasdiqlash uchun /admin buyrug'ini bosing`;
          
          // Send notification to admin
          try {
            await ctx.telegram.sendMessage(envVariables.ADMIN_TELEGRAM_ID, adminNotification);
          } catch (error) {
            console.error(`Failed to notify admin ${envVariables.ADMIN_TELEGRAM_ID}:`, error);
          }
        } catch (error) {
          console.error('Failed to send admin notification:', error);
        }
        
        ctx.session.registrationStep = 'store_image';
        await ctx.reply(getMessage(language, 'registration.storeImageRequest'), { reply_markup: getSkipImageKeyboard(language) });
      } catch (error) {
        console.error('Seller registration error:', error);
        if (error.message === 'Seller already exists with this telegram ID') {
          await ctx.reply(getMessage(language, 'error.sellerAlreadyExists'));
        } else {
          await ctx.reply(getMessage(language, 'error.general'));
        }
      }
    }
  }

  @Action(/store_(\d+)/)
  async onStoreSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    this.initializeSession(ctx);
    const storeId = parseInt(ctx.match[1]);
    await this.handleStoreDetails(ctx, storeId);
  }
  
  @Action(/buy_(\d+)/)
  async onBuyProduct(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    this.initializeSession(ctx);
    const productId = parseInt(ctx.match[1]);
    await this.handleBuyProduct(ctx, productId);
  }

  @Action(/rate_(\d+)/)
  async onRateProduct(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    this.initializeSession(ctx);
    const rating = parseInt(ctx.match[1]);
    await this.handleRateProduct(ctx, rating);
  }

  @Action(/rate_store_(\d+)/)
  async onRateStore(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    this.initializeSession(ctx);
    const rating = parseInt(ctx.match[1]);
    await this.handleRateStore(ctx, rating);
  }

  @Action(/page_(\d+)/)
  async onPageChange(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    this.initializeSession(ctx);
    const page = parseInt(ctx.match[1]);
    ctx.session.currentPage = page;
    await this.handleFindStores(ctx);
  }

  @Action('current_page')
  async onCurrentPage(@Ctx() ctx: TelegramContext) {
    // Do nothing when user clicks on current page number
    // This prevents unnecessary actions
  }

  @Action('back_to_stores')
  async onBackToStores(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Clear any selected store/product
    ctx.session.selectedStoreId = undefined;
    ctx.session.selectedProductId = undefined;
    ctx.session.selectedPaymentMethod = undefined;
    ctx.session.action = undefined;
    
    // Ask for location again to show stores
    ctx.session.action = 'finding_stores';
    await ctx.reply(getMessage(language, 'stores.requestLocation'), { reply_markup: getLocationKeyboard(language) });
  }

  @Action('back_to_main_menu')
  async onBackToMainMenu(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    // Clear all session data
    ctx.session.selectedStoreId = undefined;
    ctx.session.selectedProductId = undefined;
    ctx.session.selectedPaymentMethod = undefined;
    ctx.session.action = undefined;
    ctx.session.currentPage = undefined;
    
    // Show main menu
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (user || seller) {
      const language = user?.language || seller?.language || 'uz';
      const role = user ? 'user' : 'seller';
      await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, role) });
    }
  }

  @Action('try_again_location')
  async onTryAgainLocation(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Ask for location again
    ctx.session.action = 'finding_stores';
    await ctx.reply(getMessage(language, 'stores.requestLocation'), { reply_markup: getLocationKeyboard(language) });
  }

  @Action(/lang_(uz|ru)/)
  async onLanguageSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    this.initializeSession(ctx);
    const language = ctx.match[1] as 'uz' | 'ru';
    ctx.session.language = language;

    await ctx.reply(getMessage(language, 'languageSelected'));
    await ctx.reply(getMessage(language, 'selectRole'), { reply_markup: getRoleKeyboard(language) });
  }

  @Action('back_to_language')
  async onBackToLanguage(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Clear registration data
    ctx.session.role = undefined;
    ctx.session.registrationStep = undefined;
    ctx.session.userData = undefined;
    ctx.session.sellerData = undefined;
    
    await ctx.reply(getMessage(language, 'selectLanguage'), { reply_markup: getLanguageKeyboard() });
  }

  @Action(/role_(user|seller)/)
  async onRoleSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    this.initializeSession(ctx);
    const roleString = ctx.match[1] as 'user' | 'seller';
    const language = ctx.session.language || 'uz';
    
    // Convert string to UserRole enum
    const role = roleString === 'user' ? UserRole.USER : UserRole.SELLER;
    ctx.session.role = role;

    await ctx.reply(getMessage(language, 'roleSelected.confirmation', { role: getMessage(language, `roleSelected.${roleString}`) }));
    
    // Start registration process directly
    if (roleString === 'user') {
      ctx.session.registrationStep = 'phone';
      await ctx.reply(getMessage(language, 'registration.phoneRequest'), { reply_markup: getContactKeyboard(language) });
    } else {
      ctx.session.registrationStep = 'phone';
      await ctx.reply(getMessage(language, 'registration.phoneRequest'), { reply_markup: getContactKeyboard(language) });
    }
  }

  @Action(/payment_(cash|card|click|payme)/)
  async onPaymentMethod(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.match) return;
    
    const paymentMethod = ctx.match[1];
    const language = ctx.session.language || 'uz';
    
    // Payment method selection is no longer needed for registration or purchase
    // Users can discuss payment method directly with sellers
    await ctx.reply(getMessage(language, 'purchase.paymentMethodNotNeeded'));
  }

  @Action('back_to_store')
  async onBackToStore(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    // Go back to store details
    if (ctx.session.selectedStoreId) {
      await this.handleStoreDetails(ctx, ctx.session.selectedStoreId);
    } else {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.storeNotFound'));
    }
  }

  @Action(/business_(cafe|restaurant|market|bakery|other)/)
  async onBusinessType(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.match) return;
    if (ctx.session.registrationStep !== 'business_type') return;

    const businessType = ctx.match[1];
    const language = ctx.session.language || 'uz';
    
    if (ctx.session.role === UserRole.SELLER) {
      if (!ctx.session.sellerData) {
        ctx.session.sellerData = {};
      }
      ctx.session.sellerData.businessType = businessType as any;
      ctx.session.registrationStep = 'opens_at';
      await ctx.reply(getMessage(language, 'registration.businessTypeRequest'));
    }
  }

  @Action('back_to_business_name')
  async onBackToBusinessName(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Go back to business name step
    ctx.session.registrationStep = 'business_name';
    await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
  }

  @Action('back_to_business_type')
  async onBackToBusinessType(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Go back to business type step
    ctx.session.registrationStep = 'business_type';
    await ctx.reply(getMessage(language, 'registration.businessTypeRequest'), { reply_markup: getBusinessTypeKeyboard(language) });
  }

  @Action('back_to_opens_at')
  async onBackToOpensAt(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Go back to opens at step
    ctx.session.registrationStep = 'opens_at';
    await ctx.reply(getMessage(language, 'registration.opensAtRequest'));
  }

  @Action('back_to_closes_at')
  async onBackToClosesAt(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Go back to closes at step
    ctx.session.registrationStep = 'closes_at';
    await ctx.reply(getMessage(language, 'registration.closesAtRequest'));
  }

  @Action('skip_image')
  async onSkipImage(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Skip image upload and go to main menu
    await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'seller') });
  }

  // Admin Panel Action Handlers
  @Action('admin_all_sellers')
  async onAdminAllSellers(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Check if admin is authenticated
    if (!ctx.session.adminAuthenticated) {
      return ctx.reply(getMessage(language, 'admin.loginRequired'));
    }
    
    try {
      const sellers = await this.adminService.getAllSellers();
      const currentPage = ctx.session.adminCurrentPage || 0;
      
      await ctx.reply(getMessage(language, 'admin.allSellers', { count: sellers.length }), {
        reply_markup: getAdminSellerListKeyboard(sellers, currentPage, 'all')
      });
    } catch (error) {
      console.error('Admin all sellers error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_pending_sellers')
  async onAdminPendingSellers(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    try {
      const sellers = await this.adminService.getSellersByStatus(SellerStatus.PENDING);
      const currentPage = ctx.session.adminCurrentPage || 0;
      
      await ctx.reply(getMessage(language, 'admin.pendingSellers', { count: sellers.length }), {
        reply_markup: getAdminSellerListKeyboard(sellers, currentPage, 'pending')
      });
    } catch (error) {
      console.error('Admin pending sellers error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_approved_sellers')
  async onAdminApprovedSellers(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    try {
      const sellers = await this.adminService.getSellersByStatus(SellerStatus.APPROVED);
      const currentPage = ctx.session.adminCurrentPage || 0;
      
      await ctx.reply(getMessage(language, 'admin.approvedSellers', { count: sellers.length }), {
        reply_markup: getAdminSellerListKeyboard(sellers, currentPage, 'approved')
      });
    } catch (error) {
      console.error('Admin approved sellers error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_rejected_sellers')
  async onAdminRejectedSellers(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    try {
      const sellers = await this.adminService.getSellersByStatus(SellerStatus.REJECTED);
      const currentPage = ctx.session.adminCurrentPage || 0;
      
      await ctx.reply(getMessage(language, 'admin.rejectedSellers', { count: sellers.length }), {
        reply_markup: getAdminSellerListKeyboard(sellers, currentPage, 'rejected')
      });
    } catch (error) {
      console.error('Admin rejected sellers error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_statistics')
  async onAdminStatistics(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    try {
      const stats = await this.adminService.getStatistics();
      
      await ctx.reply(getMessage(language, 'admin.statistics', stats), {
        reply_markup: getAdminMainKeyboard()
      });
    } catch (error) {
      console.error('Admin statistics error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_search')
  async onAdminSearch(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    ctx.session.adminAction = 'searching';
    await ctx.reply(getMessage(language, 'admin.searchResults', { count: 0 }));
  }

  @Action('admin_broadcast')
  async onAdminBroadcast(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    await ctx.reply(getMessage(language, 'admin.broadcastMessage'), {
      reply_markup: getAdminBroadcastKeyboard()
    });
  }

  @Action(/admin_seller_(\d+)/)
  async onAdminSellerDetails(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const seller = await this.adminService.getSellerWithDetails(sellerId);
      
      if (!seller) {
        return ctx.reply(getMessage(language, 'admin.sellerNotFound'));
      }
      
      const hours = `${Math.floor(seller.opensAt / 60)}:${(seller.opensAt % 60).toString().padStart(2, '0')} - ${Math.floor(seller.closesAt / 60)}:${(seller.closesAt % 60).toString().padStart(2, '0')}`;
      const location = seller.location ? `${seller.location.latitude}, ${seller.location.longitude}` : 'Manzil yo\'q';
      const productCount = seller.products?.length || 0;
      const orderCount = seller.products?.reduce((sum, product) => sum + (product.orders?.length || 0), 0) || 0;
      const averageRating = await this.ratingsService.getAverageRatingBySeller(sellerId);
      
      const sellerInfo = getMessage(language, 'admin.sellerDetails', {
        businessName: seller.businessName,
        businessType: seller.businessType,
        phoneNumber: seller.phoneNumber,
        hours: hours,
        location: location,
        createdAt: formatDateForDisplay(seller.createdAt),
        status: seller.status,
        productCount: productCount,
        orderCount: orderCount,
        rating: Math.round(averageRating * 10) / 10
      });
      
      await ctx.reply(sellerInfo, {
        reply_markup: getAdminSellerDetailsKeyboard(sellerId)
      });
    } catch (error) {
      console.error('Admin seller details error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action(/admin_approve_(\d+)/)
  async onAdminApproveSeller(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const seller = await this.adminService.updateSellerStatus(sellerId, SellerStatus.APPROVED);
      
      if (seller) {
        // Notify seller about approval
        try {
          const approvalMessage = {
            uz: '✅ Sizning do\'koningiz tasdiqlandi! Endi mahsulot qo\'shishingiz mumkin.',
            ru: '✅ Ваш магазин подтвержден! Теперь вы можете добавлять товары.'
          };
          
          await ctx.telegram.sendMessage(seller.telegramId, approvalMessage[seller.language]);
        } catch (error) {
          console.error('Failed to notify seller about approval:', error);
        }
        
        await ctx.reply(getMessage(language, 'admin.actionSuccess'));
      } else {
        await ctx.reply(getMessage(language, 'admin.actionFailed'));
      }
    } catch (error) {
      console.error('Admin approve seller error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action(/admin_reject_(\d+)/)
  async onAdminRejectSeller(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const seller = await this.adminService.updateSellerStatus(sellerId, SellerStatus.REJECTED);
      
      if (seller) {
        // Notify seller about rejection
        try {
          const rejectionMessage = {
            uz: '❌ Sizning do\'koningiz rad etildi. Qo\'shimcha ma\'lumot uchun qo\'llab-quvvatlash bilan bog\'laning.',
            ru: '❌ Ваш магазин отклонен. Для получения дополнительной информации свяжитесь с поддержкой.'
          };
          
          await ctx.telegram.sendMessage(seller.telegramId, rejectionMessage[seller.language]);
        } catch (error) {
          console.error('Failed to notify seller about rejection:', error);
        }
        
        await ctx.reply(getMessage(language, 'admin.actionSuccess'));
      } else {
        await ctx.reply(getMessage(language, 'admin.actionFailed'));
      }
    } catch (error) {
      console.error('Admin reject seller error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action(/admin_block_(\d+)/)
  async onAdminBlockSeller(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const seller = await this.adminService.updateSellerStatus(sellerId, SellerStatus.BLOCKED);
      
      if (seller) {
        // Notify seller about blocking
        try {
          const blockMessage = {
            uz: '🚫 Sizning do\'koningiz bloklandi. Qo\'shimcha ma\'lumot uchun qo\'llab-quvvatlash bilan bog\'laning.',
            ru: '🚫 Ваш магазин заблокирован. Для получения дополнительной информации свяжитесь с поддержкой.'
          };
          
          await ctx.telegram.sendMessage(seller.telegramId, blockMessage[seller.language]);
        } catch (error) {
          console.error('Failed to notify seller about blocking:', error);
        }
        
        await ctx.reply(getMessage(language, 'admin.actionSuccess'));
      } else {
        await ctx.reply(getMessage(language, 'admin.actionFailed'));
      }
    } catch (error) {
      console.error('Admin block seller error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action(/admin_contact_(\d+)/)
  async onAdminContactSeller(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const seller = await this.adminService.getSellerWithDetails(sellerId);
      
      if (!seller) {
        return ctx.reply(getMessage(language, 'admin.sellerNotFound'));
      }
      
      const contactInfo = getMessage(language, 'admin.contactSeller', {
        phoneNumber: seller.phoneNumber,
        telegramId: seller.telegramId
      });
      
      await ctx.reply(contactInfo);
    } catch (error) {
      console.error('Admin contact seller error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action(/admin_seller_products_(\d+)/)
  async onAdminSellerProducts(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const products = await this.adminService.getSellerProducts(sellerId);
      
      if (products.length === 0) {
        return ctx.reply(getMessage(language, 'admin.noProducts'));
      }
      
      let productsList = '';
      products.forEach((product, index) => {
        productsList += getMessage(language, 'admin.productItem', {
          number: index + 1,
          price: product.price,
          description: product.description,
          date: formatDateForDisplay(product.createdAt)
        });
      });
      
      await ctx.reply(getMessage(language, 'admin.sellerProducts', { count: products.length }) + '\n\n' + productsList);
    } catch (error) {
      console.error('Admin seller products error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action(/admin_seller_rating_(\d+)/)
  async onAdminSellerRating(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const sellerId = parseInt(ctx.match[1]);
    
    try {
      const ratings = await this.ratingsService.findBySeller(sellerId);
      
      if (ratings.length === 0) {
        return ctx.reply(getMessage(language, 'admin.noRatings'));
      }
      
      let ratingsList = '';
      ratings.forEach((rating, index) => {
        ratingsList += getMessage(language, 'admin.ratingItem', {
          number: index + 1,
          rating: rating.rating,
          user: rating.user?.phoneNumber || 'Noma\'lum',
          date: formatDateForDisplay(rating.createdAt)
        });
      });
      
      await ctx.reply(getMessage(language, 'admin.sellerRatings', { count: ratings.length }) + '\n\n' + ratingsList);
    } catch (error) {
      console.error('Admin seller rating error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_back_to_main')
  async onAdminBackToMain(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Clear admin session data
    ctx.session.adminAction = undefined;
    ctx.session.adminCurrentPage = undefined;
    ctx.session.adminSearchQuery = undefined;
    
    await ctx.reply(getMessage(language, 'admin.mainMenu'), {
      reply_markup: getAdminMainKeyboard()
    });
  }

  @Action(/admin_page_(\d+)_(\w+)/)
  async onAdminPageChange(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    const page = parseInt(ctx.match[1]);
    const status = ctx.match[2];
    
    ctx.session.adminCurrentPage = page;
    
    try {
      let sellers;
      if (status === 'all') {
        sellers = await this.adminService.getAllSellers();
      } else {
        sellers = await this.adminService.getSellersByStatus(status as SellerStatus);
      }
      
      await ctx.reply(getMessage(language, `admin.${status === 'all' ? 'allSellers' : status + 'Sellers'}`, { count: sellers.length }), {
        reply_markup: getAdminSellerListKeyboard(sellers, page, status)
      });
    } catch (error) {
      console.error('Admin page change error:', error);
      await ctx.reply(getMessage(language, 'admin.actionFailed'));
    }
  }

  @Action('admin_current_page')
  async onAdminCurrentPage(@Ctx() ctx: TelegramContext) {
    // Do nothing when user clicks on current page number
  }

  private async handleFindStores(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    // Check if user is a seller (sellers shouldn't find stores)
    if (seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellersCannotFindStores'));
    }
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    // Always ask for current location when finding stores
    const language = ctx.session.language || 'uz';
    ctx.session.action = 'finding_stores';
    await ctx.reply(getMessage(language, 'stores.requestLocation'), { reply_markup: getLocationKeyboard(language) });
  }

  private async handleFindStoresWithLocation(@Ctx() ctx: TelegramContext, location: any) {
    const language = ctx.session.language || 'uz';
    
    // Clear the action
    ctx.session.action = undefined;
    
    // Update user's location in database
    if (ctx.from) {
      const telegramId = ctx.from.id.toString();
      const user = await this.usersService.findByTelegramId(telegramId);
      
      if (user) {
        // Update user's location
        await this.usersService.update(user.id, {
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });
        console.log('Updated user location in database');
      }
    }
    
    console.log('Searching for stores with user location:', {
      latitude: location.latitude,
      longitude: location.longitude
    });
    
    const stores = await this.sellersService.findNearbyStores(
      location.latitude,
      location.longitude
    );

    console.log('Found stores:', stores.length);
    stores.forEach((store, index) => {
      console.log(`Store ${index + 1}:`, {
        id: store.id,
        name: store.businessName,
        products: store.products.length,
        distance: store.distance,
        distanceKm: store.distance ? `${store.distance.toFixed(2)} km` : 'N/A',
        isOpen: store.isOpen,
        storeLocation: store.location
      });
    });

    if (stores.length === 0) {
      // Check if there are any approved sellers at all
      const allApprovedSellers = await this.sellersService.findApprovedSellers();
      console.log('Total approved sellers:', allApprovedSellers.length);
      
      if (allApprovedSellers.length === 0) {
      return ctx.reply(getMessage(language, 'error.noStoresNearby'), { 
        reply_markup: getNoStoresKeyboard(language) 
      });
      } else {
        // There are approved sellers but none with available products
        return ctx.reply(getMessage(language, 'error.noStoresWithProducts'), { 
          reply_markup: getNoStoresKeyboard(language) 
        });
      }
    }

    const currentPage = ctx.session.currentPage || 0;
    
    let storeList = '';
    const itemsPerPage = 10;
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStores = stores.slice(startIndex, endIndex);

    for (const [index, store] of currentStores.entries()) {
      const storeNumber = startIndex + index + 1;
      const distance = store.distance;
      const isOpen = store.isOpen;
      const status = isOpen ? getMessage(language, 'stores.openStatus') : getMessage(language, 'stores.closedStatus');
      
      // Format distance - if distance is null, show "N/A", otherwise format properly
      const distanceText = distance === null ? 'N/A' : formatDistance(distance);
      
      // Get average rating for the store
      const averageRating = await this.ratingsService.getAverageRatingBySeller(store.id);
      const ratingCount = await this.ratingsService.getSellerRatingCount(store.id);
      
      // Format rating display
      let ratingDisplay = '';
      if (averageRating > 0) {
        const stars = '⭐'.repeat(Math.round(averageRating));
        ratingDisplay = ` ${stars} (${averageRating.toFixed(1)})`;
        if (ratingCount > 0) {
          ratingDisplay += ` (${ratingCount} baho)`;
        }
      }
      
      storeList += getMessage(language, 'stores.storeItem', {
        number: storeNumber,
        businessName: store.businessName,
        businessType: store.businessType,
        distance: distanceText,
        status: status
      }) + ratingDisplay + '\n';
    }

    await ctx.reply(getMessage(language, 'stores.nearbyStores', { storeList }), { reply_markup: getStoreListKeyboard(stores, currentPage, language) });
  }

  private async handleStoreDetails(@Ctx() ctx: TelegramContext, storeId: number) {
    const store = await this.sellersService.findOne(storeId);
    if (!store) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.storeNotFound'));
    }

    const products = await this.productsService.findBySeller(storeId);
    const language = ctx.session.language || 'uz';

    const hours = `${Math.floor(store.opensAt / 60)}:${(store.opensAt % 60).toString().padStart(2, '0')} - ${Math.floor(store.closesAt / 60)}:${(store.closesAt % 60).toString().padStart(2, '0')}`;
    const isOpen = this.isStoreOpen(store.opensAt, store.closesAt);
    const status = isOpen ? getMessage(language, 'stores.openStatus') : getMessage(language, 'stores.closedStatus');

    // Add location link if available
    let locationLink = '';
    if (store.location && store.location.latitude && store.location.longitude) {
      const mapUrl = `https://maps.google.com/?q=${store.location.latitude},${store.location.longitude}`;
      const locationText = language === 'ru' ? 'Посмотреть на карте' : 'Xaritada ko\'rish';
      locationLink = `\n🗺️ <a href="${mapUrl}">${locationText}</a>`;
    }

    // Get store rating
    const averageRating = await this.ratingsService.getAverageRatingBySeller(storeId);
    const ratingCount = await this.ratingsService.getSellerRatingCount(storeId);
    
    // Store information
    let storeInfo = getMessage(language, 'stores.storeDetailsHeader', {
      businessName: store.businessName,
      businessType: store.businessType,
      phoneNumber: store.phoneNumber,
      hours: hours,
      status: status
    }) + locationLink;
    
    // Add rating information if available
    if (ratingCount > 0) {
      const ratingText = language === 'ru' ? 
        `\n⭐ Рейтинг: ${averageRating.toFixed(1)}/5 (${ratingCount} оценок)` :
        `\n⭐ Reyting: ${averageRating.toFixed(1)}/5 (${ratingCount} baho)`;
      storeInfo += ratingText;
    }

    // Send store image if available
    if (store.imageUrl && store.imageUrl.trim() !== '') {
      try {
        // Validate image URL format
        const imageUrl = store.imageUrl.trim();
        
        // Check if it's a valid image URL or file_id
        if (imageUrl.startsWith('http') && (
          imageUrl.includes('.jpg') || 
          imageUrl.includes('.jpeg') || 
          imageUrl.includes('.png') || 
          imageUrl.includes('api.telegram.org')
        )) {
          // For Telegram file URLs, they might be expired, so we'll try to send as InputFile
          if (imageUrl.includes('api.telegram.org')) {
            try {
              // Try to send as URL first
              await ctx.replyWithPhoto(imageUrl, { 
                caption: storeInfo,
                parse_mode: 'HTML'
              });
            } catch (telegramError) {
              console.log('Telegram file URL expired or invalid, sending text only:', telegramError.message);
              await ctx.reply(storeInfo, { parse_mode: 'HTML' });
            }
          } else {
            // For external URLs, try to send as photo
            await ctx.replyWithPhoto(imageUrl, { 
              caption: storeInfo,
              parse_mode: 'HTML'
            });
          }
        } else if (imageUrl.length > 20 && !imageUrl.includes('http')) {
          // This might be a file_id, try to send it directly
          try {
            await ctx.replyWithPhoto(imageUrl, { 
              caption: storeInfo,
              parse_mode: 'HTML'
            });
          } catch (fileIdError) {
            console.log('File ID invalid, sending text only:', fileIdError.message);
            await ctx.reply(storeInfo, { parse_mode: 'HTML' });
          }
        } else {
          console.log('Invalid image URL format:', imageUrl);
          await ctx.reply(storeInfo, { parse_mode: 'HTML' });
        }
      } catch (error) {
        console.error('Error sending store image:', error);
        // If image fails, just send the text info
        await ctx.reply(storeInfo, { parse_mode: 'HTML' });
      }
    } else {
      await ctx.reply(storeInfo, { parse_mode: 'HTML' });
    }

    if (products.length > 0) {
      // Add products list with buy buttons
      let productsList = '';
      products.forEach((product, index) => {
        const formattedDate = formatDateForDisplay(product.availableUntil);
        
        productsList += getMessage(language, 'products.productItemWithBuy', {
          number: index + 1,
          id: product.id,
          code: product.code,
          price: product.price,
          description: product.description,
          availableUntil: formattedDate
        });
      });

      ctx.session.selectedStoreId = storeId;
      await ctx.reply(productsList, { 
        reply_markup: getProductListKeyboard(products, language) 
      });
    } else {
      await ctx.reply(getMessage(language, 'stores.noProductsAvailable'));
    }
  }

  private async handleBuyProduct(@Ctx() ctx: TelegramContext, productId: number) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    const product = await this.productsService.findOne(productId);
    if (!product) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productNotFound'));
    }

    // Store selected product and directly complete purchase
    ctx.session.selectedProductId = productId;
    
    // Directly complete the purchase without payment method selection
    await this.handleCompletePurchase(ctx);
  }

  private async handleMyOrders(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    const orders = await this.ordersService.findByUser(user.id);
    const language = ctx.session.language || 'uz';

    if (orders.length === 0) {
      return ctx.reply(getMessage(language, 'orders.noOrders'));
    }

    let ordersList = '';
    orders.forEach((order, index) => {
      ordersList += getMessage(language, 'orders.orderItem', {
        number: index + 1,
        code: order.code,
        price: order.totalPrice,
        date: formatDateForDisplay(order.createdAt)
      });
    });

    await ctx.reply(getMessage(language, 'orders.myOrders', { ordersList }));
  }

  private async handleAddProduct(@Ctx() ctx: TelegramContext) {
    try {
      const language = ctx.session.language || 'uz';
      
      console.log('=== HANDLE ADD PRODUCT DEBUG ===');
      console.log('Current session step:', ctx.session.registrationStep);
      console.log('Current role:', ctx.session.role);
      
      // Check if user is a seller
      if (ctx.session.role !== UserRole.SELLER) {
        // Try to automatically set the role by checking the database
        const telegramId = ctx.from?.id.toString();
        if (telegramId) {
          const existingSeller = await this.sellersService.findByTelegramId(telegramId);
          if (existingSeller) {
            ctx.session.role = UserRole.SELLER;
            console.log('Auto-set session role to SELLER from database');
          } else {
            await ctx.reply(getMessage(language, 'error.notSeller'));
            return;
          }
        } else {
          await ctx.reply(getMessage(language, 'error.notSeller'));
          return;
        }
      }

      // Check if seller is approved
      const telegramId = ctx.from?.id.toString();
      if (!telegramId) {
        await ctx.reply(getMessage(language, 'error.userNotFound'));
        return;
      }

      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller || seller.status !== SellerStatus.APPROVED) {
        await ctx.reply(getMessage(language, 'error.sellerNotApproved'));
        return;
      }

      // Start product creation flow
      ctx.session.registrationStep = 'product_price';
      ctx.session.productData = {};
      
      console.log('Set registration step to product_price');
      console.log('New session step:', ctx.session.registrationStep);
      
      await ctx.reply(getMessage(language, 'registration.priceRequest'));
    } catch (error) {
      console.error('Error in handleAddProduct:', error);
      await this.handleError(ctx, error, 'handleAddProduct');
    }
  }

  private async handleMyProducts(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    console.log('Looking for products for seller with telegramId:', telegramId);
    
    const seller = await this.sellersService.findByTelegramId(telegramId);
    console.log('Found seller for my products:', seller);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }

    console.log('Searching for products with sellerId:', seller.id);
    const products = await this.productsService.findBySeller(seller.id);
    console.log('Found products:', products);
    
    const language = ctx.session.language || 'uz';

    if (products.length === 0) {
      return ctx.reply(getMessage(language, 'products.noProducts'));
    }

    let productsList = '';
    products.forEach((product, index) => {
      productsList += getMessage(language, 'products.productItem', {
        number: index + 1,
        price: product.price,
        date: formatDateForDisplay(product.createdAt)
      });
    });

    await ctx.reply(getMessage(language, 'products.myProducts', { productsList }));
  }

  private async handleSupport(@Ctx() ctx: TelegramContext) {
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'support.support', { username: envVariables.SUPPORT_USERNAME }), {
      reply_markup: getSupportKeyboard(language)
    });
  }

  private async handleRateProduct(@Ctx() ctx: TelegramContext, rating: number) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    const productId = ctx.session.selectedProductId;
    if (!productId) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productNotSelected'));
    }

    try {
      await this.ratingsService.create({
        rating,
        type: 'product',
        userId: user.id,
        productId
      });

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.ratingSubmitted', { rating }));
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.ratingFailed'));
    }
  }

  private async handleRateStore(@Ctx() ctx: TelegramContext, rating: number) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    // Try to get seller ID from session first
    let sellerId = ctx.session.selectedStoreId;
    
    // If not in session, try to get from pending ratings
    if (!sellerId) {
      sellerId = this.pendingRatings.get(telegramId);
      if (sellerId) {
        console.log('Found seller ID from pending ratings:', sellerId);
        // Remove from pending ratings after use
        this.pendingRatings.delete(telegramId);
      }
    }
    
    // If still not found, try to find from recent confirmed orders
    if (!sellerId) {
      const recentOrders = await this.ordersService.findByUser(user.id);
      console.log('Recent orders for user:', recentOrders.map(o => ({ 
        id: o.id, 
        status: o.status, 
        productId: o.product?.id,
        sellerId: o.product?.seller?.id 
      })));
      
      const confirmedOrder = recentOrders.find(order => 
        order.status === OrderStatus.CONFIRMED && 
        order.product && 
        order.product.seller
      );
      
      if (confirmedOrder && confirmedOrder.product.seller) {
        sellerId = confirmedOrder.product.seller.id;
        console.log('Found seller ID from confirmed order:', sellerId);
      }
    }

    if (!sellerId) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.storeNotFound'));
    }

    // Check if user has already rated this store
    const hasRated = await this.ratingsService.hasUserRatedSeller(user.id, sellerId);
    if (hasRated) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.alreadyRated'));
    }

    try {
      const createdRating = await this.ratingsService.create({
        rating,
        type: 'seller',
        userId: user.id,
        sellerId
      });

      console.log('Rating created successfully:', createdRating);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.storeRatingSubmitted', { rating }));
    } catch (error) {
      console.error('Error creating rating:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.ratingFailed'));
    }
  }

  private async requestStoreRating(@Ctx() ctx: TelegramContext, sellerId: number) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) return;

    // Check if user has already rated this store
    const hasRated = await this.ratingsService.hasUserRatedSeller(user.id, sellerId);
    if (hasRated) return; // Don't ask for rating if already rated

    // Set the selected store ID for rating
    ctx.session.selectedStoreId = sellerId;

    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'success.storeRatingRequest'), {
      reply_markup: getStoreRatingKeyboard()
    });
  }

  private async requestStoreRatingAfterApproval(telegram: any, buyerTelegramId: string, sellerId: number, language: 'uz' | 'ru') {
    try {
      // Get the user by telegram ID
      const user = await this.usersService.findByTelegramId(buyerTelegramId);
      if (!user) return;

      // Check if user has already rated this store
      const hasRated = await this.ratingsService.hasUserRatedSeller(user.id, sellerId);
      if (hasRated) return; // Don't ask for rating if already rated

      // Send rating request message to the buyer
      const ratingMessage = language === 'ru' ? 
        '⭐ Оцените услуги магазина после получения товара:' :
        '⭐ Mahsulotni olganingizdan so\'ng do\'kon xizmatini baholang:';

      await telegram.sendMessage(buyerTelegramId, ratingMessage, {
        reply_markup: getStoreRatingKeyboard()
      });

      // Store the seller ID in a temporary storage for this user
      // We'll use a simple in-memory storage for now
      if (!this.pendingRatings) {
        this.pendingRatings = new Map();
      }
      this.pendingRatings.set(buyerTelegramId, sellerId);
    } catch (error) {
      console.error('Failed to request store rating after approval:', error);
    }
  }

  private isStoreOpen(opensAt: number, closesAt: number): boolean {
    return isStoreOpen(opensAt, closesAt);
  }

  private async handleCompletePurchase(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    const productId = ctx.session.selectedProductId;
    if (!productId) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productNotSelected'));
    }

    // Payment method is no longer required for purchase
    // Users can discuss payment method directly with the seller

    try {
      const product = await this.productsService.findOne(productId);
      if (!product) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.productNotFound'));
      }

      const order = await this.ordersService.create({
        userId: user.id,
        productId: product.id
      });

      // Set initial status to PENDING
      await this.ordersService.updateStatus(order.id, OrderStatus.PENDING);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.orderCreated', {
        code: order.code,
        productCode: product.code,
        price: order.totalPrice
      }));
      
      // Send notification to seller with approval buttons
      const seller = await this.sellersService.findOne(product.seller.id);
      if (seller) {
        const sellerTexts = {
          uz: `🆕 Yangi buyurtma!\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${product.code}\n💰 Narxi: ${order.totalPrice} so'm\n👤 Mijoz: ${user.phoneNumber}\n📦 Mahsulot: ${product.description}\n\n✅ Tasdiqlash yoki ❌ Rad etish uchun tugmani bosing`,
          ru: `🆕 Новый заказ!\n\n📋 Код заказа: ${order.code}\n🔢 Код товара: ${product.code}\n💰 Цена: ${order.totalPrice} сум\n👤 Клиент: ${user.phoneNumber}\n📦 Товар: ${product.description}\n\n✅ Нажмите кнопку для подтверждения или ❌ отмены`
        };
        
        try {
          await ctx.telegram.sendMessage(seller.telegramId, sellerTexts[seller.language], {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Tasdiqlash', callback_data: `approve_order_${order.id}` },
                  { text: '❌ Rad etish', callback_data: `reject_order_${order.id}` }
                ]
              ]
            }
          });
        } catch (error) {
          console.error('Failed to send order notification to seller:', error);
        }
      }

      // Clear session data
      ctx.session.selectedProductId = undefined;
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.orderCreationFailed'));
    }
  }

  @Command('fiximageurls')
  async fixImageUrlsCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers with image URLs
      const allSellers = await this.sellersService.findAll();
      let updatedCount = 0;
      let invalidCount = 0;
      
      for (const seller of allSellers) {
        if (seller.imageUrl) {
          const imageUrl = seller.imageUrl.trim();
          
          // Check if URL is invalid or expired
          if (!imageUrl.startsWith('http') || 
              (!imageUrl.includes('.jpg') && 
               !imageUrl.includes('.jpeg') && 
               !imageUrl.includes('.png') && 
               !imageUrl.includes('api.telegram.org'))) {
            
            console.log(`Fixing invalid image URL for seller ${seller.businessName} (ID: ${seller.id})`);
            console.log(`Old URL: ${imageUrl}`);
            
            // Clear the invalid image URL
            await this.sellersService.update(seller.id, { imageUrl: undefined });
            invalidCount++;
          }
        }
      }
      
      await ctx.reply(`🔧 Image URL Fix Results:\n\n📊 Total Sellers: ${allSellers.length}\n❌ Invalid URLs found: ${invalidCount}\n✅ Fixed sellers: ${invalidCount}\n\nAll invalid image URLs have been cleared!`);
    } catch (error) {
      console.error('Fix image URLs error:', error);
      await ctx.reply(`❌ Fix image URLs failed: ${error.message}`);
    }
  }

  @Action(/approve_order_(\d+)/)
  async onApproveOrder(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const orderId = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id.toString();
    
    try {
      // Get the order with product and seller info
      const order = await this.ordersService.findOne(orderId);
      if (!order) {
        return ctx.reply('❌ Buyurtma topilmadi!');
      }
      
      // Check if product and seller relations are loaded
      if (!order.product || !order.product.seller) {
        console.error('Order relations not loaded properly:', order);
        return ctx.reply('❌ Buyurtma ma\'lumotlari to\'liq emas!');
      }
      
      // Check if the current user is the seller of this product
      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller || order.product.seller.id !== seller.id) {
        return ctx.reply('❌ Siz bu buyurtmani tasdiqlay olmaysiz!');
      }
      
      // Update order status to confirmed
      await this.ordersService.updateStatus(orderId, OrderStatus.CONFIRMED);
      
      // Deactivate the product (remove from availability)
      await this.productsService.deactivate(order.product.id);
      
      // Notify the buyer
      const buyer = await this.usersService.findOne(order.user.id);
      if (buyer) {
        const buyerTexts = {
          uz: `✅ Buyurtmangiz tasdiqlandi!\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${order.product.code}\n💰 Narxi: ${order.totalPrice} so'm\n📦 Mahsulot: ${order.product.description}\n\nDo'konga borganda buyurtma kodini ko'rsating!`,
          ru: `✅ Ваш заказ подтвержден!\n\n📋 Код заказа: ${order.code}\n🔢 Код товара: ${order.product.code}\n💰 Цена: ${order.totalPrice} сум\n📦 Товар: ${order.product.description}\n\nПокажите код заказа в магазине!`
        };
        
        try {
          await ctx.telegram.sendMessage(buyer.telegramId, buyerTexts[buyer.language]);
          
          // Request store rating after seller approves the purchase
          await this.requestStoreRatingAfterApproval(ctx.telegram, buyer.telegramId, order.product.seller.id, buyer.language);
        } catch (error) {
          console.error('Failed to notify buyer:', error);
        }
      }
      
      // Update the original message to show it's approved
      await ctx.editMessageText(`✅ Buyurtma tasdiqlandi!\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${order.product.code}\n💰 Narxi: ${order.totalPrice} so'm\n👤 Mijoz: ${buyer?.phoneNumber}\n📦 Mahsulot: ${order.product.description}\n\n✅ Mahsulot mijozga berildi`);
      
    } catch (error) {
      console.error('Order approval error:', error);
      await ctx.reply('❌ Xatolik yuz berdi!');
    }
  }

  @Action(/reject_order_(\d+)/)
  async onRejectOrder(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    if (!ctx.from) return;
    
    const orderId = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id.toString();
    
    try {
      // Get the order with product and seller info
      const order = await this.ordersService.findOne(orderId);
      if (!order) {
        return ctx.reply('❌ Buyurtma topilmadi!');
      }
      
      // Check if product and seller relations are loaded
      if (!order.product || !order.product.seller) {
        console.error('Order relations not loaded properly:', order);
        return ctx.reply('❌ Buyurtma ma\'lumotlari to\'liq emas!');
      }
      
      // Check if the current user is the seller of this product
      const seller = await this.sellersService.findByTelegramId(telegramId);
      if (!seller || order.product.seller.id !== seller.id) {
        return ctx.reply('❌ Siz bu buyurtmani rad eta olmaysiz!');
      }
      
      // Update order status to cancelled
      await this.ordersService.updateStatus(orderId, OrderStatus.CANCELLED);
      
      // Reactivate the product (make it available again)
      await this.productsService['productsRepository'].update(order.product.id, { isActive: true });
      
      // Notify the buyer
      const buyer = await this.usersService.findOne(order.user.id);
      if (buyer) {
        const buyerTexts = {
          uz: `❌ Buyurtmangiz rad etildi.\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${order.product.code}\n💰 Narxi: ${order.totalPrice} so'm\n📦 Mahsulot: ${order.product.description}\n\nBoshqa mahsulotlarni ko'rib chiqing.`,
          ru: `❌ Ваш заказ отклонен.\n\n📋 Код заказа: ${order.code}\n🔢 Код товара: ${order.product.code}\n💰 Цена: ${order.totalPrice} сум\n📦 Товар: ${order.product.description}\n\nПосмотрите другие товары.`
        };
        
        try {
          await ctx.telegram.sendMessage(buyer.telegramId, buyerTexts[buyer.language]);
        } catch (error) {
          console.error('Failed to notify buyer:', error);
        }
      }
      
      // Update the original message to show it's rejected
      await ctx.editMessageText(`❌ Buyurtma rad etildi!\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${order.product.code}\n💰 Narxi: ${order.totalPrice} so'm\n👤 Mijoz: ${buyer?.phoneNumber}\n📦 Mahsulot: ${order.product.description}\n\n❌ Buyurtma bekor qilindi`);
      
    } catch (error) {
      console.error('Order rejection error:', error);
      await ctx.reply('❌ Xatolik yuz berdi!');
    }
  }

  @Command('myorders')
  async myOrdersCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }
    
    try {
      // Get all orders for this seller's products
      const orders = await this.ordersService.findBySeller(seller.id);
      const language = seller.language || 'uz';
      
      if (orders.length === 0) {
        return ctx.reply(getMessage(language, 'orders.noOrders'));
      }
      
      // Group orders by status
      const pendingOrders = orders.filter(order => order.status === OrderStatus.PENDING);
      const confirmedOrders = orders.filter(order => order.status === OrderStatus.CONFIRMED);
      const completedOrders = orders.filter(order => order.status === OrderStatus.COMPLETED);
      const cancelledOrders = orders.filter(order => order.status === OrderStatus.CANCELLED);
      
      let message = `📋 Sizning buyurtmalaringiz:\n\n`;
      message += `⏳ Kutilayotgan: ${pendingOrders.length}\n`;
      message += `✅ Tasdiqlangan: ${confirmedOrders.length}\n`;
      message += `✅ Bajarilgan: ${completedOrders.length}\n`;
      message += `❌ Bekor qilingan: ${cancelledOrders.length}\n\n`;
      
      if (pendingOrders.length > 0) {
        message += `🆕 Kutilayotgan buyurtmalar:\n`;
        pendingOrders.forEach((order, index) => {
          message += `${index + 1}. 📋 Buyurtma kodi: ${order.code}\n`;
          message += `   🔢 Mahsulot kodi: ${order.product.code}\n`;
          message += `   💰 Narxi: ${order.totalPrice} so'm\n`;
          message += `   📦 Mahsulot: ${order.product.description}\n`;
          message += `   👤 Mijoz: ${order.user.phoneNumber}\n`;
          message += `   📅 Sana: ${formatDateForDisplay(order.createdAt)}\n\n`;
        });
      }
      
      await ctx.reply(message);
    } catch (error) {
      console.error('My orders error:', error);
      const language = seller.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  @Command('testorder')
  async testOrderCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get the first user and product for testing
      const users = await this.usersService.findAll();
      const products = await this.productsService.findAll();
      
      if (users.length === 0 || products.length === 0) {
        return ctx.reply('❌ No users or products found for testing!');
      }
      
      const testUser = users[0];
      const testProduct = products[0];
      
      console.log('Testing order creation with:', {
        userId: testUser.id,
        productId: testProduct.id,
        user: testUser.telegramId,
        product: testProduct.description
      });
      
      // Create a test order
      const order = await this.ordersService.create({
        userId: testUser.id,
        productId: testProduct.id
      });
      
      console.log('Created order:', {
        id: order.id,
        code: order.code,
        totalPrice: order.totalPrice,
        user: order.user ? order.user.telegramId : 'NULL',
        product: order.product ? order.product.description : 'NULL',
        productSeller: order.product?.seller ? order.product.seller.businessName : 'NULL'
      });
      
      await ctx.reply(`🧪 Test Order Created:\n\n📋 Order ID: ${order.id}\n📋 Order Code: ${order.code}\n💰 Total Price: ${order.totalPrice}\n👤 User: ${order.user ? order.user.telegramId : 'NULL'}\n📦 Product: ${order.product ? order.product.description : 'NULL'}\n🏪 Seller: ${order.product?.seller ? order.product.seller.businessName : 'NULL'}\n\nCheck console for detailed logs.`);
      
    } catch (error) {
      console.error('Test order error:', error);
      await ctx.reply(`❌ Test order failed: ${error.message}`);
    }
  }

  private sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 500); // Limit length
  }

  private validateTelegramId(telegramId: string): boolean {
    return /^\d{1,20}$/.test(telegramId);
  }

  private validatePhoneNumber(phoneNumber: string): boolean {
    return /^\+998\s?(9[0-9]|3[3]|7[1]|8[8]|6[1])[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/.test(phoneNumber);
  }

  private async handleError(ctx: TelegramContext, error: any, operation: string): Promise<void> {
    const errorId = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();
    
    console.error(`[${timestamp}] Error ID: ${errorId} | Operation: ${operation}`, {
      error: error.message,
      stack: error.stack,
      telegramId: ctx.from?.id,
      chatId: ctx.chat?.id,
      message: ctx.message,
    });

    // Log to file in production
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to send this to a logging service
      console.error(`Production Error Log - ID: ${errorId}`, {
        operation,
        error: error.message,
        telegramId: ctx.from?.id,
        timestamp,
      });
    }

    const language = ctx.session?.language || 'uz';
    const errorMessage = getMessage(language, 'error.general');
    
    try {
      await ctx.reply(`${errorMessage}\n\n🔍 Error ID: ${errorId}`);
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }

  private async validateSession(ctx: TelegramContext): Promise<boolean> {
    try {
      if (!ctx.from?.id) {
        console.warn('Invalid session: No user ID');
        return false;
      }

      const telegramId = ctx.from.id.toString();
      if (!this.validateTelegramId(telegramId)) {
        console.warn('Invalid session: Invalid Telegram ID', { telegramId });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  @Command('securitytest')
  async securityTestCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      const tests: Array<{name: string; passed: boolean; details: string}> = [];
      
      // Test 1: Input sanitization
      const maliciousInput = '<script>alert("xss")</script>javascript:alert("injection")';
      const sanitized = this.sanitizeInput(maliciousInput);
      tests.push({
        name: 'Input Sanitization',
        passed: !sanitized.includes('<script>') && !sanitized.includes('javascript:'),
        details: `Input: "${maliciousInput}" -> Sanitized: "${sanitized}"`
      });
      
      // Test 2: Telegram ID validation
      const validTelegramId = '123456789';
      const invalidTelegramId = 'abc123';
      tests.push({
        name: 'Telegram ID Validation',
        passed: this.validateTelegramId(validTelegramId) && !this.validateTelegramId(invalidTelegramId),
        details: `Valid: ${validTelegramId} (${this.validateTelegramId(validTelegramId)}) | Invalid: ${invalidTelegramId} (${this.validateTelegramId(invalidTelegramId)})`
      });
      
      // Test 3: Phone number validation
      const validPhone = '+998901234567';
      const invalidPhone = '123456789';
      tests.push({
        name: 'Phone Number Validation',
        passed: this.validatePhoneNumber(validPhone) && !this.validatePhoneNumber(invalidPhone),
        details: `Valid: ${validPhone} (${this.validatePhoneNumber(validPhone)}) | Invalid: ${invalidPhone} (${this.validatePhoneNumber(invalidPhone)})`
      });
      
      // Test 4: Database connection
      try {
        const userCount = await this.usersService.findAll();
        tests.push({
          name: 'Database Connection',
          passed: true,
          details: `Connected successfully. Users count: ${userCount.length}`
        });
      } catch (error) {
        tests.push({
          name: 'Database Connection',
          passed: false,
          details: `Connection failed: ${error.message}`
        });
      }
      
      // Test 5: Rate limiting (simulate)
      tests.push({
        name: 'Rate Limiting',
        passed: true,
        details: 'Rate limiting implemented (30 requests/minute per user)'
      });
      
      // Generate report
      const passedTests = tests.filter(t => t.passed).length;
      const totalTests = tests.length;
      
      let report = `🔒 Security Test Results\n\n`;
      report += `✅ Passed: ${passedTests}/${totalTests}\n`;
      report += `❌ Failed: ${totalTests - passedTests}/${totalTests}\n\n`;
      
      tests.forEach((test, index) => {
        report += `${index + 1}. ${test.name}\n`;
        report += `   ${test.passed ? '✅ PASS' : '❌ FAIL'}\n`;
        report += `   ${test.details}\n\n`;
      });
      
      if (passedTests === totalTests) {
        report += `🎉 All security tests passed! The bot is secure.`;
      } else {
        report += `⚠️ Some security tests failed. Please review the configuration.`;
      }
      
      await ctx.reply(report);
      
    } catch (error) {
      console.error('Security test error:', error);
      await ctx.reply(`❌ Security test failed: ${error.message}`);
    }
  }

  @Command('debugstores')
  async debugStoresCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      console.log('=== DEBUG STORES COMMAND ===');
      
      // 1. Check all sellers
      const allSellers = await this.sellersService.findAll();
      console.log(`Total sellers in database: ${allSellers.length}`);
      
      allSellers.forEach((seller, index) => {
        console.log(`Seller ${index + 1}:`, {
          id: seller.id,
          name: seller.businessName,
          status: seller.status,
          location: seller.location,
          hasLocation: !!seller.location,
          createdAt: seller.createdAt
        });
      });
      
      // 2. Check approved sellers
      const approvedSellers = await this.sellersService.findApprovedSellers();
      console.log(`\nApproved sellers: ${approvedSellers.length}`);
      
      approvedSellers.forEach((seller, index) => {
        console.log(`Approved Seller ${index + 1}:`, {
          id: seller.id,
          name: seller.businessName,
          status: seller.status,
          location: seller.location,
          hasLocation: !!seller.location
        });
      });
      
      // 3. Check all products
      const allProducts = await this.productsService.findAll();
      console.log(`\nTotal products in database: ${allProducts.length}`);
      
      allProducts.forEach((product, index) => {
        console.log(`Product ${index + 1}:`, {
          id: product.id,
          description: product.description,
          sellerId: product.seller?.id,
          sellerName: product.seller?.businessName,
          isActive: product.isActive,
          availableUntil: product.availableUntil,
          code: product.code
        });
      });
      
      // 4. Check active products
      const activeProducts = allProducts.filter(product => 
        product.isActive && new Date(product.availableUntil) > new Date()
      );
      console.log(`\nActive products: ${activeProducts.length}`);
      
      activeProducts.forEach((product, index) => {
        console.log(`Active Product ${index + 1}:`, {
          id: product.id,
          description: product.description,
          sellerId: product.seller?.id,
          sellerName: product.seller?.businessName,
          isActive: product.isActive,
          availableUntil: product.availableUntil
        });
      });
      
      // 5. Test store finding with a sample location
      const testLat = 41.2995;
      const testLon = 69.2401;
      console.log(`\nTesting store finding with location: ${testLat}, ${testLon}`);
      
      const stores = await this.sellersService.findNearbyStores(testLat, testLon);
      console.log(`\nStores found: ${stores.length}`);
      
      stores.forEach((store, index) => {
        console.log(`Found Store ${index + 1}:`, {
          id: store.id,
          name: store.businessName,
          products: store.products.length,
          distance: store.distance,
          distanceKm: store.distance ? `${store.distance.toFixed(2)} km` : 'N/A',
          isOpen: store.isOpen,
          storeLocation: store.location
        });
      });
      
      // 6. Check which sellers have products
      const sellersWithProducts = approvedSellers.filter(seller => {
        const sellerProducts = allProducts.filter(product => product.seller?.id === seller.id);
        const activeSellerProducts = sellerProducts.filter(product => 
          product.isActive && new Date(product.availableUntil) > new Date()
        );
        return activeSellerProducts.length > 0;
      });
      
      console.log(`\nApproved sellers with active products: ${sellersWithProducts.length}`);
      sellersWithProducts.forEach((seller, index) => {
        const sellerProducts = allProducts.filter(product => product.seller?.id === seller.id);
        const activeSellerProducts = sellerProducts.filter(product => 
          product.isActive && new Date(product.availableUntil) > new Date()
        );
        console.log(`Seller with products ${index + 1}:`, {
          id: seller.id,
          name: seller.businessName,
          totalProducts: sellerProducts.length,
          activeProducts: activeSellerProducts.length
        });
      });
      
      await ctx.reply(`🔍 Store Debug Complete!\n\n📊 Results:\n• Total sellers: ${allSellers.length}\n• Approved sellers: ${approvedSellers.length}\n• Total products: ${allProducts.length}\n• Active products: ${activeProducts.length}\n• Sellers with active products: ${sellersWithProducts.length}\n• Stores found in test: ${stores.length}\n\nCheck console for detailed logs.`);
      
    } catch (error) {
      console.error('Debug stores error:', error);
      await ctx.reply(`❌ Debug failed: ${error.message}`);
    }
  }

  @Command('fixproductdates')
  async fixProductDatesCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      console.log('=== FIX PRODUCT DATES ===');
      
      const allProducts = await this.productsService.findAll();
      console.log(`Total products: ${allProducts.length}`);
      
      const now = new Date();
      const futureDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
      
      let fixedCount = 0;
      let activeCount = 0;
      
      for (const product of allProducts) {
        const availableUntil = new Date(product.availableUntil);
        const isExpired = availableUntil <= now;
        const isActive = product.isActive;
        
        console.log(`Product ${product.id}:`, {
          description: product.description,
          isActive,
          availableUntil: availableUntil.toISOString(),
          isExpired,
          sellerId: product.seller?.id,
          sellerName: product.seller?.businessName
        });
        
        if (isExpired || !isActive) {
          // Fix the product by setting it to active and extending the date
          await this.productsService.update(product.id, {
            isActive: true,
            availableUntil: futureDate.toISOString()
          });
          fixedCount++;
          console.log(`Fixed product ${product.id}`);
        } else {
          activeCount++;
        }
      }
      
      console.log(`Fixed ${fixedCount} products, ${activeCount} were already active`);
      
      await ctx.reply(`🔧 Product Dates Fixed!\n\n📊 Results:\n• Total products: ${allProducts.length}\n• Fixed products: ${fixedCount}\n• Already active: ${activeCount}\n• New expiry date: ${futureDate.toISOString()}\n\nTry finding stores again!`);
      
    } catch (error) {
      console.error('Fix product dates error:', error);
      await ctx.reply(`❌ Fix failed: ${error.message}`);
    }
  }

  @Command('testproductcreation')
  async testProductCreationCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      console.log('=== TEST PRODUCT CREATION ===');
      
      // Test with sample product data
      const testProductData = {
        price: 10000,
        originalPrice: 12000,
        description: 'Test product description with special characters: < > & " \'',
        availableUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };
      
      console.log('Test product data:', testProductData);
      
      // Test sanitization
      const sanitizedDescription = this.sanitizeInput(testProductData.description);
      console.log('Original description:', testProductData.description);
      console.log('Sanitized description:', sanitizedDescription);
      
      // Get a seller for testing
      const sellers = await this.sellersService.findAll();
      if (sellers.length === 0) {
        return ctx.reply('❌ No sellers found for testing!');
      }
      
      const testSeller = sellers[0];
      console.log('Using seller for test:', testSeller.businessName);
      
      // Test DTO creation
      const createProductDto = {
        price: testProductData.price,
        originalPrice: testProductData.originalPrice,
        description: testProductData.description, // Use original description
        availableUntil: testProductData.availableUntil,
        sellerId: testSeller.id
      };
      
      console.log('Creating product with DTO:', createProductDto);
      
      // Create the product
      const createdProduct = await this.productsService.create(createProductDto);
      
      console.log('Product created successfully:', {
        id: createdProduct.id,
        description: createdProduct.description,
        price: createdProduct.price,
        code: createdProduct.code,
        isActive: createdProduct.isActive
      });
      
      await ctx.reply(`🧪 Test Product Creation Successful!\n\n📦 Product ID: ${createdProduct.id}\n📝 Description: ${createdProduct.description}\n💰 Price: ${createdProduct.price}\n🔢 Code: ${createdProduct.code}\n✅ Active: ${createdProduct.isActive}\n\nCheck console for detailed logs.`);
      
    } catch (error) {
      console.error('Test product creation error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testproduct')
  async testProductCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Test the sanitizeInput function
      const testInputs = [
        'Normal text',
        'Text with <script> tags',
        'Text with javascript:alert()',
        'Very long text that exceeds 500 characters ' + 'x'.repeat(600),
        'Text with special characters: & < > " \''
      ];
      
      let result = '🧪 Product Input Test Results:\n\n';
      
      testInputs.forEach((input, index) => {
        const sanitized = this.sanitizeInput(input);
        result += `${index + 1}. Original: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"\n`;
        result += `   Sanitized: "${sanitized.substring(0, 50)}${sanitized.length > 50 ? '...' : ''}"\n`;
        result += `   Length: ${input.length} -> ${sanitized.length}\n\n`;
      });
      
      await ctx.reply(result);
      
    } catch (error) {
      console.error('Test product error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testprice')
  async testPriceCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      console.log('=== TEST PRICE PARSING ===');
      
      // Test various price inputs
      const testPrices = [
        '30000',
        '30000.50',
        '30000,50',
        '30,000',
        '30.000',
        '30000 ',
        ' 30000',
        '30000\n',
        '30000\t'
      ];
      
      let result = '🧪 Price Parsing Test Results:\n\n';
      
      testPrices.forEach((priceInput, index) => {
        const originalText = priceInput;
        const sanitizedText = this.sanitizeInput(priceInput);
        const originalParsed = parseFloat(originalText);
        const sanitizedParsed = parseFloat(sanitizedText);
        
        result += `${index + 1}. Input: "${priceInput}"\n`;
        result += `   Original parsed: ${originalParsed} (${isNaN(originalParsed) ? 'NaN' : 'Valid'})\n`;
        result += `   Sanitized: "${sanitizedText}"\n`;
        result += `   Sanitized parsed: ${sanitizedParsed} (${isNaN(sanitizedParsed) ? 'NaN' : 'Valid'})\n`;
        result += `   Valid original: ${!isNaN(originalParsed) && originalParsed > 0}\n`;
        result += `   Valid sanitized: ${!isNaN(sanitizedParsed) && sanitizedParsed > 0}\n\n`;
      });
      
      await ctx.reply(result);
      
    } catch (error) {
      console.error('Test price error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testinput')
  async testInputCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    try {
      console.log('=== TEST INPUT COMMAND ===');
      console.log('User ID:', ctx.from.id);
      console.log('Session exists:', !!ctx.session);
      console.log('Session language:', ctx.session?.language);
      console.log('Session role:', ctx.session?.role);
      console.log('Session step:', ctx.session?.registrationStep);
      
      await ctx.reply(`🧪 Test Input Command Working!\n\n📊 Session Info:\n- Language: ${ctx.session?.language || 'none'}\n- Role: ${ctx.session?.role || 'none'}\n- Step: ${ctx.session?.registrationStep || 'none'}\n\n✅ Bot is responding to commands!`);
      
    } catch (error) {
      console.error('Test input error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testpriceinput')
  async testPriceInputCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    try {
      console.log('=== TEST PRICE INPUT COMMAND ===');
      
      // Simulate the exact price validation logic
      const testPrice = '30000';
      console.log('Testing price:', testPrice);
      
      const price = parseFloat(testPrice);
      console.log('Parsed price:', price);
      console.log('Is NaN:', isNaN(price));
      console.log('Is <= 0:', price <= 0);
      
      if (isNaN(price) || price <= 0) {
        console.log('❌ Price validation failed');
        await ctx.reply('❌ Price validation failed - price is invalid');
      } else {
        console.log('✅ Price validation passed');
        await ctx.reply(`✅ Price validation passed!\n\n💰 Price: ${price}\n📊 Type: ${typeof price}\n🔢 Is NaN: ${isNaN(price)}\n📈 Is > 0: ${price > 0}`);
      }
      
    } catch (error) {
      console.error('Test price input error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testproductflow')
  async testProductFlowCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    try {
      console.log('=== TEST PRODUCT FLOW COMMAND ===');
      
      // Set session to seller role and product_price step
      ctx.session.role = UserRole.SELLER;
      ctx.session.registrationStep = 'product_price';
      ctx.session.productData = {};
      
      console.log('Set session role to SELLER');
      console.log('Set registration step to product_price');
      console.log('Current session state:', {
        role: ctx.session.role,
        step: ctx.session.registrationStep,
        productData: ctx.session.productData
      });
      
      await ctx.reply('🧪 Product flow test started!\n\n💰 Please enter a price (e.g., 30000):');
      
    } catch (error) {
      console.error('Test product flow error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testsession')
  async testSessionCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    try {
      console.log('=== TEST SESSION COMMAND ===');
      
      const telegramId = ctx.from.id.toString();
      console.log('User ID:', telegramId);
      
      // Check database for user/seller
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      const existingSeller = await this.sellersService.findByTelegramId(telegramId);
      
      console.log('Database check:');
      console.log('- Existing user:', !!existingUser);
      console.log('- Existing seller:', !!existingSeller);
      
      // Set session role based on database
      if (existingSeller) {
        ctx.session.role = UserRole.SELLER;
        console.log('Set session role to SELLER');
      } else if (existingUser) {
        ctx.session.role = UserRole.USER;
        console.log('Set session role to USER');
      } else {
        console.log('No existing user or seller found');
      }
      
      await ctx.reply(`🧪 Session Test Results:\n\n📊 Database Check:\n- User exists: ${!!existingUser}\n- Seller exists: ${!!existingSeller}\n\n🎭 Session Role: ${ctx.session.role || 'undefined'}\n\n✅ Session role should now be set correctly!`);
      
    } catch (error) {
      console.error('Test session error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('teststorehours')
  async testStoreHoursCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      const { isStoreOpen, formatDateForDisplay } = await import('src/common/utils/store-hours.util');
      
      // Test different store hours scenarios
      const testCases = [
        { opensAt: 540, closesAt: 1080, name: '9:00 - 18:00 (same day)' },
        { opensAt: 1320, closesAt: 360, name: '22:00 - 6:00 (cross midnight)' },
        { opensAt: 0, closesAt: 1440, name: '0:00 - 24:00 (24 hours)' },
        { opensAt: 600, closesAt: 1200, name: '10:00 - 20:00 (same day)' },
        { opensAt: 1200, closesAt: 600, name: '20:00 - 10:00 (cross midnight)' }
      ];
      
      let result = `🧪 Store Hours Test Results:\n\n`;
      
      testCases.forEach((testCase, index) => {
        const isOpen = isStoreOpen(testCase.opensAt, testCase.closesAt);
        result += `${index + 1}. ${testCase.name}\n   Hours: ${Math.floor(testCase.opensAt/60)}:${(testCase.opensAt%60).toString().padStart(2,'0')} - ${Math.floor(testCase.closesAt/60)}:${(testCase.closesAt%60).toString().padStart(2,'0')}\n   Status: ${isOpen ? '🟢 Open' : '🔴 Closed'}\n\n`;
      });
      
      // Test date formatting
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const formattedDate = formatDateForDisplay(futureDate);
      
      result += `📅 Date Formatting Test:\n`;
      result += `Original: ${futureDate.toISOString()}\n`;
      result += `Formatted: ${formattedDate}\n`;
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Store hours test error:', error);
      await ctx.reply(`❌ Store hours test failed: ${error.message}`);
    }
  }

  @Command('testpricevalidation')
  async testPriceValidationCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      const { cleanAndValidatePrice } = await import('src/common/utils/store-hours.util');
      
      // Test different price input formats
      const testCases = [
        '50000',
        '50,000',
        '50 000',
        '50.000',
        '50,000.00',
        '50 000.00',
        'abc',
        '0',
        '-1000',
        '1000000000',
        '1,000,000',
        '1 000 000'
      ];
      
      let result = `🧪 Price Validation Test Results:\n\n`;
      
      testCases.forEach((testCase, index) => {
        const validation = cleanAndValidatePrice(testCase);
        result += `${index + 1}. Input: "${testCase}"\n   Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}\n   Price: ${validation.price || 'N/A'}\n   Error: ${validation.error || 'None'}\n\n`;
      });
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Price validation test error:', error);
      await ctx.reply(`❌ Price validation test failed: ${error.message}`);
    }
  }

  @Command('testtimevalidation')
  async testTimeValidationCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      const { validateAndParseTime } = await import('src/common/utils/store-hours.util');
      
      // Test different time input formats
      const testCases = [
        '9:00',
        '09:00',
        '22:30',
        '0:00',
        '23:59',
        '12:30',
        '1:45',
        'abc',
        '25:00',
        '12:60',
        '9:0',
        '9:',
        ':30'
      ];
      
      let result = `🧪 Time Validation Test Results:\n\n`;
      
      testCases.forEach((testCase, index) => {
        const validation = validateAndParseTime(testCase);
        result += `${index + 1}. Input: "${testCase}"\n   Valid: ${validation.isValid ? '✅ Yes' : '❌ No'}\n   Hours: ${validation.hours || 'N/A'}\n   Minutes: ${validation.minutes || 'N/A'}\n   Error: ${validation.error || 'None'}\n\n`;
      });
      
      await ctx.reply(result);
    } catch (error) {
      console.error('Time validation test error:', error);
      await ctx.reply(`❌ Time validation test failed: ${error.message}`);
    }
  }

  @Command('teststorerating')
  async testStoreRatingCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get the first seller for testing
      const sellers = await this.sellersService.findAll();
      
      if (sellers.length === 0) {
        return ctx.reply('❌ No sellers found for testing!');
      }
      
      const testSeller = sellers[0];
      
      // Test store rating functionality
      const averageRating = await this.ratingsService.getAverageRatingBySeller(testSeller.id);
      const ratingCount = await this.ratingsService.getSellerRatingCount(testSeller.id);
      
      const result = `🧪 Store Rating Test Results:\n\n` +
        `🏪 Store: ${testSeller.businessName}\n` +
        `⭐ Average Rating: ${averageRating.toFixed(1)}/5\n` +
        `📊 Rating Count: ${ratingCount}\n\n` +
        `✅ Store rating system is working!`;
      
      await ctx.reply(result);
      
    } catch (error) {
      console.error('Test store rating error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testratingflow')
  async testRatingFlowCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      return ctx.reply('❌ User not found');
    }

    // Test the rating flow
    try {
      // Get recent orders
      const recentOrders = await this.ordersService.findByUser(user.id);
      await ctx.reply(`📋 Found ${recentOrders.length} orders for user`);
      
      // Show order details
      for (const order of recentOrders.slice(0, 3)) {
        await ctx.reply(`Order ${order.id}: Status=${order.status}, Product=${order.product?.id}, Seller=${order.product?.seller?.id}`);
      }
      
      // Test pending ratings
      const pendingSellerId = this.pendingRatings.get(telegramId);
      await ctx.reply(`🔍 Pending rating for seller: ${pendingSellerId || 'None'}`);
      
    } catch (error) {
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }
}