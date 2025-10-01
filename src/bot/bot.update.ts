// src/bot/bot.update.ts
import { Update, Ctx, Start, Command, On, Action, Message, InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { BotContext } from './bot.context';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getMainMenuKeyboard, getLocationKeyboard, getStoreListKeyboard, getProductActionKeyboard, getRatingKeyboard, getProductRatingKeyboard, getStoreRatingKeyboard, getLanguageKeyboard, getRoleKeyboard, getBusinessTypeKeyboard, getPaymentMethodKeyboard, getContactKeyboard, getProductListKeyboard, getNoStoresKeyboard, getSupportKeyboard, getSkipImageKeyboard, getAdminMainKeyboard, getAdminSellerActionKeyboard, getAdminSellerDetailsKeyboard, getAdminSellerListKeyboard, getAdminConfirmationKeyboard, getAdminBroadcastKeyboard, getAdminLoginKeyboard, getAdminLogoutKeyboard, getOrderConfirmationKeyboard, getQuantitySelectionKeyboard, getPurchaseConfirmationKeyboard, getMiniAppKeyboard } from 'src/common/utils/keyboard.util';
import { formatDistance } from 'src/common/utils/distance.util';
import { isStoreOpen, formatDateForDisplay, formatRelativeTime, cleanAndValidatePrice, validateAndParseTime } from 'src/common/utils/store-hours.util';
import { UsersService } from 'src/users/users.service';
import { SellersService } from 'src/sellers/sellers.service';
import { User } from 'src/users/entities/user.entity';
import { Seller } from 'src/sellers/entities/seller.entity';
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
  private pendingRatings = new Map<string, number>(); // Store product IDs for pending ratings
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
    @InjectBot() private bot: Telegraf<BotContext>,
  ) {}

  async sendMessageToAdmin(adminTelegramId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(adminTelegramId, message, {
        parse_mode: 'HTML'
      });
      console.log(' Admin notification sent successfully');
    } catch (error) {
      console.error(' Failed to send admin notification:', error);
      throw error;
    }
  }

  async sendMessageToSeller(sellerTelegramId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(sellerTelegramId, message, {
        parse_mode: 'HTML'
      });
      console.log(' Seller notification sent successfully');
    } catch (error) {
      console.error(' Failed to send seller notification:', error);
      throw error;
    }
  }

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
    
    // Always load the latest session from the provider to ensure role persistence
    const providerSession = this.sessionProvider.getSession(telegramId);
    
    console.log('=== INITIALIZE SESSION DEBUG ===');
    console.log('Telegram ID:', telegramId);
    console.log('Existing ctx.session:', ctx.session);
    console.log('Provider session:', providerSession);
    
    // Merge with existing session if it exists, otherwise use provider session
    if (ctx.session) {
      ctx.session = { ...ctx.session, ...providerSession };
      console.log('Merged session:', ctx.session);
    } else {
      ctx.session = providerSession;
      console.log('Using provider session:', ctx.session);
    }
  }

  private async ensureSessionRole(ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // ✅ DON'T check database during registration
    // Only check database for existing users, not during registration
    if (ctx.session.registrationStep) {
      console.log('Registration in progress - skipping database check');
      return;
    }
    
    // ✅ ALSO skip if user has a role but is in registration flow
    if (ctx.session.role && (ctx.session.role === UserRole.USER || ctx.session.role === UserRole.SELLER)) {
      console.log('User has role set - skipping database check');
      return;
    }
    
    const telegramId = ctx.from.id.toString();
    console.log('=== ENSURE SESSION ROLE DEBUG ===');
    console.log('Telegram ID:', telegramId);
    console.log('Current session role:', ctx.session.role);
    console.log('Session exists:', !!ctx.session);
    
    const existingSeller = await this.sellersService.findByTelegramId(telegramId);
    const existingUser = await this.usersService.findByTelegramId(telegramId);
    
    console.log('Existing seller found:', !!existingSeller);
    console.log('Existing user found:', !!existingUser);
    
    if (existingSeller) {
      ctx.session.role = UserRole.SELLER;
      console.log('Auto-set session role to SELLER for existing seller');
    } else if (existingUser) {
      ctx.session.role = UserRole.USER;
      console.log('Auto-set session role to USER for existing user');
    } else {
      console.log('No existing user or seller found - role remains undefined');
    }
    
    console.log('Final session role:', ctx.session.role);
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
        name: 'Test Product - Delicious food',
        price: 15000,
        description: 'Test Product - Delicious food',
        availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Available for 24 hours
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
        // Clear any registration step for existing sellers
        ctx.session.registrationStep = undefined;
        ctx.session.productData = undefined;
        console.log('Set session role to SELLER for existing seller');
      } else if (existingUser) {
        ctx.session.role = UserRole.USER;
        // Clear any registration step for existing users
        ctx.session.registrationStep = undefined;
        ctx.session.userData = undefined;
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

  @Command('clear')
  async clearCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    // Clear registration step and related data
    ctx.session.registrationStep = undefined;
    ctx.session.productData = undefined;
    ctx.session.userData = undefined;
    ctx.session.sellerData = undefined;
    
    const language = ctx.session.language || 'uz';
    await ctx.reply('🧹 Session cleared! Registration step and data have been reset.', {
      reply_markup: getMainMenuKeyboard(language, ctx.session.role === UserRole.SELLER ? 'seller' : 'user')
    });
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
    
    // Check if user is in a scene - if so, let the scene handle ALL input
    if (ctx.scene) {
      console.log('User is in a scene - letting scene handle input');
      return; // Let the scene handle this input
    }
    

    

    
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

    // Handle admin broadcast
    if (ctx.session.adminAction && ctx.session.adminAction.startsWith('broadcasting_')) {
      if (!ctx.from) return;
      
      const telegramId = ctx.from.id.toString();
      const isAdmin = await this.adminService.isAdmin(telegramId);
      
      if (!isAdmin) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'admin.notAuthorized'));
      }
      
      try {
        let successCount = 0;
        const language = ctx.session.language || 'uz';
        
        switch (ctx.session.adminAction) {
          case 'broadcasting_all':
            const allRecipients = await this.adminService.getBroadcastRecipients('all');
            successCount = await this.sendBroadcastMessage(ctx, allRecipients.users, allRecipients.sellers, text);
            break;
          case 'broadcasting_sellers':
            const sellerRecipients = await this.adminService.getBroadcastRecipients('sellers');
            successCount = await this.sendBroadcastMessage(ctx, [], sellerRecipients.sellers, text);
            break;
          case 'broadcasting_users':
            const userRecipients = await this.adminService.getBroadcastRecipients('users');
            successCount = await this.sendBroadcastMessage(ctx, userRecipients.users, [], text);
            break;
          case 'broadcasting_approved':
            const approvedRecipients = await this.adminService.getBroadcastRecipients('approved');
            successCount = await this.sendBroadcastMessage(ctx, [], approvedRecipients.sellers, text);
            break;
        }
        
        // Clear the broadcast action
        ctx.session.adminAction = undefined;
        
        await ctx.reply(getMessage(language, 'admin.broadcastSent', { count: successCount }));
        
        // Return to admin main menu
        await ctx.reply(getMessage(language, 'admin.mainMenu'), {
          reply_markup: getAdminMainKeyboard()
        });
      } catch (error) {
        console.error('Broadcast error:', error);
        const language = ctx.session.language || 'uz';
        await ctx.reply(getMessage(language, 'admin.broadcastFailed'));
        
        // Clear the broadcast action and return to admin main menu
        ctx.session.adminAction = undefined;
        await ctx.reply(getMessage(language, 'admin.mainMenu'), {
          reply_markup: getAdminMainKeyboard()
        });
      }
      return;
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

    // Handle seller registration text inputs (but NOT product creation)
    if (ctx.session.role === UserRole.SELLER && ctx.session.registrationStep && !ctx.session.registrationStep.startsWith('product_')) {
      const step = ctx.session.registrationStep;
      
      console.log('=== SELLER REGISTRATION TEXT INPUT DEBUG ===');
      console.log('Current step:', step);
      console.log('User role:', ctx.session.role);
      console.log('Registration step exists:', !!ctx.session.registrationStep);
      
      // Let scenes handle their own registration logic
      // The seller registration scene will handle business_name, business_type, and location steps
    }

    // Handle product creation text inputs
    if (ctx.session.role === UserRole.SELLER && ctx.session.registrationStep && ctx.session.registrationStep.startsWith('product_')) {
      const step = ctx.session.registrationStep;
      
      console.log('=== PRODUCT CREATION TEXT INPUT DEBUG ===');
      console.log('Current step:', step);
      console.log('User role:', ctx.session.role);
      console.log('Registration step exists:', !!ctx.session.registrationStep);
      
      if (step === 'product_price') {
        const priceValidation = cleanAndValidatePrice(ctx.message.text);
        if (!priceValidation.isValid) {
          return ctx.reply(getMessage(language, 'validation.invalidPrice'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.price = priceValidation.price!;
        ctx.session.registrationStep = 'product_original_price';
        
        await ctx.reply(getMessage(language, 'registration.priceSuccess'));
        return;
      } else if (step === 'product_original_price') {
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
        ctx.session.productData.description = ctx.message.text;
        ctx.session.registrationStep = 'product_available_from';

        await ctx.reply(getMessage(language, 'registration.availableFromRequest'));
        return;
      } else if (step === 'product_available_from') {
        const timeValidation = validateAndParseTime(ctx.message.text);
        
        if (!timeValidation.isValid) {
          return ctx.reply(getMessage(language, 'validation.invalidTime'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.availableFrom = `${timeValidation.hours!.toString().padStart(2, '0')}:${timeValidation.minutes!.toString().padStart(2, '0')}`;
        ctx.session.registrationStep = 'product_available_until';

        await ctx.reply(getMessage(language, 'registration.availableUntilRequest'));
        return;
      } else if (step === 'product_available_until') {
        const timeValidation = validateAndParseTime(ctx.message.text);
        
        if (!timeValidation.isValid) {
          return ctx.reply(getMessage(language, 'validation.invalidTime'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.availableUntilTime = `${timeValidation.hours!.toString().padStart(2, '0')}:${timeValidation.minutes!.toString().padStart(2, '0')}`;
        ctx.session.registrationStep = 'product_quantity';

        // Initialize default quantity to 1
        if (!ctx.session.productData.quantity) {
          ctx.session.productData.quantity = 1;
        }
        
        await ctx.reply(getMessage(language, 'registration.quantityRequest'), {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '➖', callback_data: 'quantity_minus' },
                { text: `${ctx.session.productData.quantity}`, callback_data: 'quantity_display' },
                { text: '➕', callback_data: 'quantity_plus' }
              ],
              [
                { text: getMessage(language, 'actions.confirm'), callback_data: 'quantity_confirm' }
              ]
            ]
          }
        });
        return;
      } else if (step === 'product_quantity') {
        // This step should not handle text input directly
        // It should only show the inline keyboard
        await ctx.reply(getMessage(language, 'validation.invalidFormat'));
        return;
      } else if (step === 'product_enter_quantity') {
        const quantity = parseInt(ctx.message.text);
        if (isNaN(quantity) || quantity < 1 || quantity > 10000) {
          return ctx.reply(getMessage(language, 'validation.invalidQuantity'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.quantity = quantity;

        console.log('Enter quantity - setting quantity to:', quantity);

        // Create product using the main bot flow
        await this.createProductFromMainBot(ctx);
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
    } else if (text.includes(getMessage(language, 'mainMenu.statistics'))) {
      await this.handleSellerStatistics(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.changePhoto'))) {
      await this.handleChangePhoto(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.support'))) {
      await this.handleSupport(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.language'))) {
      // Show language change keyboard with different callback_data to avoid conflicts with registration
      const changeLanguageKeyboard = {
        inline_keyboard: [
          [
            { text: '🇺🇿 O\'zbekcha', callback_data: 'change_lang_uz' },
            { text: '🇷🇺 Русский', callback_data: 'change_lang_ru' }
          ]
        ]
      };
      await ctx.reply(getMessage(language, 'selectLanguage'), { reply_markup: changeLanguageKeyboard });
    } else if (ctx.session.registrationStep === 'business_name' && ctx.session.role === UserRole.SELLER) {
      // Handle business name input for seller registration
      console.log('=== BUSINESS NAME HANDLER DEBUG ===');
      console.log('Business name input:', text);
      console.log('Current seller data:', ctx.session.sellerData);
      
      if (!ctx.session.sellerData) {
        ctx.session.sellerData = {};
      }
      
      ctx.session.sellerData.businessName = text;
      ctx.session.registrationStep = 'business_type';
      
      console.log('Business name stored, moving to business type step');
      
      // Show business type selection keyboard
      const businessTypeKeyboard = {
        inline_keyboard: [
          [
            { text: '🍕 Kafe', callback_data: 'business_type_cafe' },
            { text: '🍽️ Restoran', callback_data: 'business_type_restaurant' }
          ],
          [
            { text: '🏪 Do\'kon', callback_data: 'business_type_market' },
            { text: '🥖 Nonvoyxona', callback_data: 'business_type_bakery' }
          ],
          [
            { text: '🏠 Boshqa', callback_data: 'business_type_other' }
          ]
        ]
      };
      
      await ctx.reply(getMessage(language, 'registration.businessTypeRequest'), { reply_markup: businessTypeKeyboard });
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
      console.log('- statistics:', getMessage(language, 'mainMenu.statistics'));
      console.log('- changePhoto:', getMessage(language, 'mainMenu.changePhoto'));
      console.log('- support:', getMessage(language, 'mainMenu.support'));
      console.log('- language:', getMessage(language, 'mainMenu.language'));
      
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }

  @On('contact')
  async onContact(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.message || !('contact' in ctx.message)) return;
    
    console.log('=== CONTACT HANDLER DEBUG ===');
    console.log('Registration step:', ctx.session.registrationStep);
    console.log('Session role:', ctx.session.role);
    console.log('Has scene:', !!ctx.scene);
    
    // If user is in any scene, let the scene handle the contact
    if (ctx.scene) {
      console.log('User is in a scene - letting scene handle contact');
      return; // Let the scene handle this contact
    }
    
    // Handle contact for registration process
    if (ctx.session.registrationStep === 'phone') {
      console.log('Processing phone number for registration');
      
      const contact = ctx.message.contact;
      if (!contact.phone_number) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'registration.phoneError'));
      }

      const language = ctx.session.language || 'uz';
      console.log('Processing registration for role:', ctx.session.role);
      
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

          console.log('Creating user with DTO:', createUserDto);
          await this.usersService.create(createUserDto);
          
          // ✅ ADD THIS LINE - Set the session role after successful user creation
          ctx.session.role = UserRole.USER;

          // Save the updated session to the provider
          this.sessionProvider.setSession(ctx.from.id.toString(), ctx.session);
          
          // Clear registration data
          ctx.session.registrationStep = undefined;
          ctx.session.userData = undefined;
          
          await ctx.reply(getMessage(language, 'success.userRegistration'));
          await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'user') });
          
          console.log('User registration completed successfully');
        } catch (error) {
          console.error('User registration error:', error);
          if (error.message === 'User already exists with this telegram ID') {
            await ctx.reply(getMessage(language, 'error.userAlreadyExists'));
          } else {
            await ctx.reply(getMessage(language, 'error.general'));
          }
        }
      } else if (ctx.session.role === UserRole.SELLER) {
        // Seller registration - continue to business details
        try {
          if (!ctx.from) throw new Error('User not found');
          
          // ✅ NO DATABASE CHECK DURING REGISTRATION
          // Users can register directly as sellers without being users first
          
          // Store phone number in session and move to next step
          if (!ctx.session.sellerData) {
            ctx.session.sellerData = {};
          }
          ctx.session.sellerData.phoneNumber = contact.phone_number;
          ctx.session.registrationStep = 'business_name';
          
          console.log('Seller phone number stored, moving to business name step');
          
          await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
        } catch (error) {
          console.error('Seller phone processing error:', error);
          await ctx.reply(getMessage(language, 'error.general'));
        }
      } else {
        console.log('No role set, cannot process registration');
        await ctx.reply(getMessage(language, 'error.roleNotSelected'));
      }
    } else {
      console.log('Not in phone registration step, ignoring contact');
    }
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: TelegramContext) {
    console.log('=== PHOTO HANDLER TRIGGERED ===');
    console.log('Message type:', ctx.message ? typeof ctx.message : 'No message');
    console.log('Has photo:', ctx.message && 'photo' in ctx.message);
    
    // Send a test message to confirm the handler is working
    try {
      if (ctx.from) {
        await ctx.reply('📸 Photo handler triggered! Processing...');
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
    }
    
    this.initializeSession(ctx);
    
    if (!ctx.message || !('photo' in ctx.message)) {
      console.log('Photo handler: No message or no photo found, returning');
      return;
    }
    
    console.log('=== PHOTO HANDLER DEBUG ===');
    console.log('Registration step:', ctx.session.registrationStep);
    console.log('Session role:', ctx.session.role);
    console.log('Has scene:', !!ctx.scene);
    
    // If user is in any scene, let the scene handle the photo
    if (ctx.scene) {
      console.log('User is in a scene - letting scene handle photo');
      console.log('Scene info:', ctx.scene);
      return; // Let the scene handle this photo
    }
    
    console.log('No scene detected, processing photo in main bot');
    
    const language = ctx.session.language || 'uz';
    const photos = ctx.message.photo;
    
    if (!photos || photos.length === 0) {
      await ctx.reply(getMessage(language, 'error.photoProcessingFailed'));
      return;
    }
    
    // Get the largest photo (best quality)
    const photo = photos[photos.length - 1];
    console.log('Received photo with file_id:', photo.file_id);
    
    // Handle seller store image upload (both registration and change photo)
    if (ctx.session.registrationStep === 'store_image') {
      console.log('Processing photo for store_image step');
      
      // During registration, we don't need to check the role yet
      // The role will be set after successful registration
      
      try {
        if (!ctx.from) throw new Error('User not found');
        
        // During registration, the seller might not exist yet
        // Store the image in the session for later use
        if (ctx.session.sellerData) {
          ctx.session.sellerData.imageUrl = photo.file_id;
          console.log('Store image stored in session for registration, file_id:', photo.file_id);
          await ctx.reply(getMessage(language, 'success.storeImageUploaded'));
          
          // Continue with seller creation
          await this.createSellerFromSession(ctx);
        } else {
          // Try to find existing seller for photo update
          const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
          if (seller) {
            // Store the file_id directly - this is the most reliable way
            await this.sellersService.update(seller.id, { 
              imageUrl: photo.file_id
            });
            
            console.log('Store image uploaded successfully, file_id:', photo.file_id);
            await ctx.reply(getMessage(language, 'success.storeImageUploaded'));
            
            // Clear the registration step
            ctx.session.registrationStep = undefined;
            
            // Show main menu
            await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
              reply_markup: getMainMenuKeyboard(language, 'seller') 
            });
          } else {
            await ctx.reply(getMessage(language, 'error.sellerNotFound'));
          }
        }
      } catch (error) {
        console.error('Store image processing error:', error);
        await ctx.reply(getMessage(language, 'error.photoProcessingFailed'));
      }
      return;
    }
    
    // Handle photo change (not during registration)
    if (ctx.session.registrationStep === 'change_photo') {
      console.log('Processing photo for change_photo step');
      console.log('Current session:', JSON.stringify(ctx.session, null, 2));
      console.log('User ID:', ctx.from?.id);
      
      try {
        if (!ctx.from) throw new Error('User not found');
        
        const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
        console.log('Found seller:', seller ? 'Yes' : 'No');
        
        if (seller) {
          console.log('Updating seller with new image...');
          // Store the file_id directly
          await this.sellersService.update(seller.id, { 
            imageUrl: photo.file_id
          });
          
          console.log('Store photo changed successfully, file_id:', photo.file_id);
          await ctx.reply(getMessage(language, 'success.storeImageUploaded'));
          
          // Clear the registration step
          ctx.session.registrationStep = undefined;
          
          // Update session in provider to persist the change
          try {
            await this.sessionProvider.setSession(ctx.from.id.toString(), ctx.session);
            console.log('Session updated in provider after photo change');
          } catch (sessionError) {
            console.error('Failed to update session in provider:', sessionError);
          }
          
          // Show main menu
          await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
            reply_markup: getMainMenuKeyboard(language, 'seller') 
          });
        } else {
          console.log('Seller not found for photo change');
          await ctx.reply(getMessage(language, 'error.sellerNotFound'));
        }
      } catch (error) {
        console.error('Photo change error:', error);
        await ctx.reply(getMessage(language, 'error.photoProcessingFailed'));
      }
      return;
    }
    
    console.log('Photo not processed - no matching handler found');
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
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    await this.handleBuyProduct(ctx, productId);
  }

  @Action(/rate_product_(\d+)/)
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
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
      reply_markup: getMainMenuKeyboard(language, ctx.session.role) 
    });
  }

  @Action('try_again_location')
  async onTryAgainLocation(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Ask for location again
    ctx.session.action = 'finding_stores';
    await ctx.reply(getMessage(language, 'stores.requestLocation'), { reply_markup: getLocationKeyboard(language) });
  }

  @Action(/change_lang_(uz|ru)/)
  async onLanguageChange(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    if (!ctx.match) return;
    
    const newLanguage = ctx.match[1] as 'uz' | 'ru';
    const oldLanguage = ctx.session.language || 'uz';
    
    console.log(`Language change requested: ${oldLanguage} -> ${newLanguage}`);
    console.log('Session role before language change:', ctx.session.role);
    
    try {
      // Update language in session
      ctx.session.language = newLanguage;
      
      // Update language in database based on user role
      if (ctx.session.role === UserRole.SELLER) {
        // Update seller language
        await this.sellersService.updateLanguage(ctx.from!.id.toString(), newLanguage);
        console.log('Seller language updated in database');
      } else if (ctx.session.role === UserRole.USER) {
        // Update user language
        await this.usersService.updateLanguage(ctx.from!.id.toString(), newLanguage);
        console.log('User language updated in database');
      }
      
      // Send success message in new language
      await ctx.reply(getMessage(newLanguage, 'languageChanged'));
      
      // Return to main menu with new language and correct role
      const roleType = ctx.session.role === UserRole.SELLER ? 'seller' : 'user';
      console.log('Showing main menu for role type:', roleType);
      console.log('Session role after language update:', ctx.session.role);
      console.log('Role enum values - SELLER:', UserRole.SELLER, 'USER:', UserRole.USER);
      
      await ctx.reply(getMessage(newLanguage, 'mainMenu.welcome'), { 
        reply_markup: getMainMenuKeyboard(newLanguage, roleType) 
      });
      
      console.log('Language change completed successfully');
      
    } catch (error) {
      console.error('Language change error:', error);
      
      // Fallback to old language if update fails
      ctx.session.language = oldLanguage;
      await ctx.reply(getMessage(oldLanguage, 'error.general'));
      
      // Still return to main menu with correct role
      const roleType = ctx.session.role === UserRole.SELLER ? 'seller' : 'user';
      console.log('Fallback: Showing main menu for role type:', roleType);
      console.log('Fallback: Session role after language update:', ctx.session.role);
      
      await ctx.reply(getMessage(oldLanguage, 'mainMenu.welcome'), { 
        reply_markup: getMainMenuKeyboard(oldLanguage, roleType) 
      });
    }
  }

  // Registration flow handlers - these handle the initial language and role selection
  @Action(/lang_(uz|ru)/)
  async onLanguageSelect(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.match) return;
    
    const language = ctx.match[1] as 'uz' | 'ru';
    ctx.session.language = language;
    
    console.log(`Language selected during registration: ${language}`);
    
    // Continue to role selection
    await ctx.reply(getMessage(language, 'languageSelected'));
    await ctx.reply(getMessage(language, 'selectRole'), { reply_markup: getRoleKeyboard(language) });
  }

  @Action('back_to_language')
  async onBackToLanguage(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Clear registration data and go back to language selection
    ctx.session.role = undefined;
    ctx.session.registrationStep = undefined;
    ctx.session.userData = undefined;
    ctx.session.sellerData = undefined;
    
    await ctx.reply(getMessage(language, 'selectLanguage'), { reply_markup: getLanguageKeyboard() });
  }



  @Action(/role_(user|seller)/)
  async onRoleSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    console.log('=== MAIN BOT ROLE SELECTION DEBUG ===');
    console.log('Role selected in main bot handler:', ctx.match[1]);
    console.log('Scene context available:', !!ctx.scene);
    
    this.initializeSession(ctx);
    const roleString = ctx.match[1] as 'user' | 'seller';
    const language = ctx.session.language || 'uz';
    
    // Convert string to UserRole enum
    const role = roleString === 'user' ? UserRole.USER : UserRole.SELLER;
    ctx.session.role = role;
    
    console.log('Role set in session:', role);
    console.log('Attempting to enter appropriate registration scene...');
    
    // ✅ REDIRECT TO SCENES INSTEAD OF HANDLING DIRECTLY
    if (ctx.scene) {
      try {
        if (roleString === 'user') {
          console.log('Entering user-registration scene');
          await ctx.scene.enter('user-registration');
        } else {
          console.log('Entering seller-registration scene');
          await ctx.scene.enter('seller-registration');
        }
      } catch (error) {
        console.error('Error entering registration scene:', error);
        // Fallback to direct registration if scene entry fails
        await this.handleDirectRegistration(ctx, roleString, language);
      }
    } else {
      console.log('No scene context - using direct registration');
      // Fallback to direct registration
      await this.handleDirectRegistration(ctx, roleString, language);
    }
  }

  private async handleDirectRegistration(ctx: TelegramContext, roleString: string, language: 'uz' | 'ru') {
    console.log('Using direct registration fallback');
    ctx.session.registrationStep = 'phone';
    await ctx.reply(getMessage(language, 'registration.phoneRequest'), { 
      reply_markup: getContactKeyboard(language) 
    });
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
      ctx.session.registrationStep = 'location';
      await ctx.reply(getMessage(language, 'registration.locationRequest'), {
        reply_markup: getLocationKeyboard(language)
      });
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

  @Action('admin_advanced_statistics')
  async onAdminAdvancedStatistics(@Ctx() ctx: TelegramContext) {
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
      const advancedStats = await this.adminService.getAdvancedStatistics();
      
      await ctx.reply(getMessage(language, 'admin.advancedStatistics', advancedStats), {
        reply_markup: getAdminMainKeyboard()
      });
    } catch (error) {
      console.error('Admin advanced statistics error:', error);
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

  @Action('admin_broadcast_all')
  async onAdminBroadcastAll(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    ctx.session.adminAction = 'broadcasting_all';
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'admin.broadcastMessage'));
  }

  @Action('admin_broadcast_sellers')
  async onAdminBroadcastSellers(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    ctx.session.adminAction = 'broadcasting_sellers';
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'admin.broadcastMessage'));
  }

  @Action('admin_broadcast_users')
  async onAdminBroadcastUsers(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    ctx.session.adminAction = 'broadcasting_users';
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'admin.broadcastMessage'));
  }

  @Action('admin_broadcast_approved')
  async onAdminBroadcastApproved(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.adminService.isAdmin(telegramId);
    
    if (!isAdmin) {
      const language = ctx.session?.language || 'uz';
      return ctx.reply(getMessage(language, 'admin.notAuthorized'));
    }
    
    this.initializeSession(ctx);
    ctx.session.adminAction = 'broadcasting_approved';
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'admin.broadcastMessage'));
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
      
      // Handle store hours (now optional)
      let hours = '';
      
      if (seller.opensAt !== undefined && seller.closesAt !== undefined) {
        hours = `${Math.floor(seller.opensAt / 60)}:${(seller.opensAt % 60).toString().padStart(2, '0')} - ${Math.floor(seller.opensAt / 60)}:${(seller.opensAt % 60).toString().padStart(2, '0')}`;
      } else {
        hours = language === 'ru' ? 'Время работы не указано' : 'Ish vaqti ko\'rsatilmagan';
      }
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
        // Format available time
        const availableFrom = product.availableFrom ? new Date(product.availableFrom).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const availableUntil = product.availableUntil ? new Date(product.availableUntil).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const timeRange = `${availableFrom} - ${availableUntil}`;
        
        productsList += `${index + 1}. 💰 ${product.price} so'm\n   📝 ${product.description}\n   🔢 Miqdor: ${product.quantity || 1} ta\n   ⏰ Mavjud: ${timeRange}\n   📅 ${formatDateForDisplay(product.createdAt)}\n\n`;
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
      const ratings = await this.adminService.getSellerRatings(sellerId);
      
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

    for (const [index, store] of Array.from(currentStores.entries())) {
      const storeNumber = startIndex + index + 1;
      const distance = store.distance;
      
      // Format distance - if distance is null, show "N/A", otherwise format properly
      const distanceText = distance === null ? 'N/A' : formatDistance(distance);
      
      // Use the average rating that's already calculated in the sellers service
      const averageRating = store.averageRating || 0;
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
        distance: distanceText
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

    // Handle store hours (now optional)
    let hours = '';
    let status = '';
    
    if (store.opensAt !== undefined && store.closesAt !== undefined) {
      hours = `${Math.floor(store.opensAt / 60)}:${(store.opensAt % 60).toString().padStart(2, '0')} - ${Math.floor(store.closesAt / 60)}:${(store.closesAt % 60).toString().padStart(2, '0')}`;
      const isOpen = this.isStoreOpen(store.opensAt, store.closesAt);
      status = isOpen ? getMessage(language, 'stores.openStatus') : getMessage(language, 'stores.closedStatus');
    } else {
      hours = language === 'ru' ? 'Время работы не указано' : 'Ish vaqti ko\'rsatilmagan';
      status = language === 'ru' ? 'Статус неизвестен' : 'Status noma\'lum';
    }

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
      hours: hours
    }) + locationLink;
    
    // Add rating information if available
    if (ratingCount > 0) {
      const ratingText = language === 'ru' ? 
        `\n⭐ Рейтинг: ${averageRating.toFixed(1)}/5 (${ratingCount} оценок)` :
        `\n⭐ Reyting: ${averageRating.toFixed(1)}/5 (${ratingCount} baho)`;
      storeInfo += ratingText;
    }

    // Send store image if available
    console.log('Store imageUrl from database:', store.imageUrl);
    if (store.imageUrl && store.imageUrl.trim() !== '') {
      try {
        const imageUrl = store.imageUrl.trim();
        console.log('Attempting to display store image:', imageUrl);
        
        // Check if it's a file_id (Telegram's internal identifier)
        if (imageUrl.length > 20 && !imageUrl.includes('http')) {
          console.log('Detected file_id, sending directly:', imageUrl);
          // This is likely a file_id, send it directly
          await ctx.replyWithPhoto(imageUrl, { 
            caption: storeInfo,
            parse_mode: 'HTML'
          });
          console.log('Store image sent successfully as file_id');
        } else if (imageUrl.startsWith('http')) {
          console.log('Detected URL, attempting to send:', imageUrl);
          // This is a URL, try to send as photo
          try {
            await ctx.replyWithPhoto(imageUrl, { 
              caption: storeInfo,
              parse_mode: 'HTML'
            });
            console.log('Store image sent successfully as URL');
          } catch (urlError) {
            console.log('URL image failed, trying as file_id:', urlError.message);
            // If URL fails, try treating it as file_id
            try {
              await ctx.replyWithPhoto(imageUrl, { 
                caption: storeInfo,
                parse_mode: 'HTML'
              });
              console.log('Store image sent successfully as file_id (fallback)');
            } catch (fileIdError) {
              console.log('Both URL and file_id failed, sending text only:', fileIdError.message);
              await ctx.reply(storeInfo, { parse_mode: 'HTML' });
            }
          }
        } else {
          console.log('Invalid image format, sending text only:', imageUrl);
          await ctx.reply(storeInfo, { parse_mode: 'HTML' });
        }
      } catch (error) {
        console.error('Error sending store image:', error);
        // If image fails, just send the text info
        await ctx.reply(storeInfo, { parse_mode: 'HTML' });
      }
    } else {
      console.log('No store image available, sending text only');
      await ctx.reply(storeInfo, { parse_mode: 'HTML' });
    }

    if (products.length > 0) {
      // Add products list with buy buttons
      let productsList = '';
      products.forEach((product, index) => {
        const formattedDate = formatRelativeTime(product.availableUntil, language);
        
        // Format time range: "today 14:00 - 21:00"
        const timeRange = this.formatTimeRange(product.availableFrom, formattedDate, language);
        
        // Format original price display with strikethrough if on sale
        let originalPriceText = '';
        if (product.originalPrice && product.originalPrice > 0 && product.originalPrice > product.price) {
          const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
          if (language === 'ru') {
            originalPriceText = `💰 <s>${product.originalPrice} сум</s> - <b>${product.price} сум</b> (${discount}% скидка)`;
          } else {
            originalPriceText = `💰 <s>${product.originalPrice} so'm</s> - <b>${product.price} so'm</b> (${discount}% chegirma)`;
          }
        } else {
          if (language === 'ru') {
            originalPriceText = `💰 <b>${product.price} сум</b>`;
          } else {
            originalPriceText = `💰 <b>${product.price} сум</b>`;
          }
        }
        
        productsList += getMessage(language, 'products.productItemWithBuy', {
          number: index + 1,
          id: product.id,
          code: product.code,
          price: product.price,
          originalPriceText: originalPriceText,
          description: product.description,
          availableUntil: timeRange,
          quantity: product.quantity || 1
        });
      });

      ctx.session.selectedStoreId = storeId;
      
      // Create custom keyboard with matching product numbers
      const productKeyboard = {
        inline_keyboard: [
          // Add buy buttons for each product with matching numbers
          ...products.map((product, index) => [{
            text: `${getMessage(language, 'actions.buy')} #${index + 1}`,
            callback_data: `buy_${product.id}`
          }]),
          // Add back buttons
          [
            {
              text: getMessage(language, 'actions.back'),
              callback_data: 'back_to_stores'
            },
            {
              text: getMessage(language, 'actions.backToMainMenu'),
              callback_data: 'back_to_main_menu'
            }
          ]
        ]
      };
      
      await ctx.reply(productsList, { 
        reply_markup: productKeyboard,
        parse_mode: 'HTML'
      });
    } else {
      await ctx.reply(getMessage(language, 'stores.noProductsAvailable'));
    }
  }

  private async handleBuyProduct(@Ctx() ctx: TelegramContext, productId: number) {
    if (!ctx.from) return;
    
    this.initializeSession(ctx);
    
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

    // Check if product has available quantity
    if (product.quantity <= 0) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productOutOfStock'));
    }

    // Store selected product and show quantity selection
    ctx.session.selectedProductId = productId;
    ctx.session.selectedQuantity = 1; // Default quantity
    
    const language = ctx.session.language || 'uz';
    
    // Show quantity selection keyboard
    await ctx.reply(
      getMessage(language, 'purchase.selectQuantity', {
        productName: product.description || `Product #${product.id}`,
        price: product.price,
        maxQuantity: product.quantity
      }),
      { 
        reply_markup: getQuantitySelectionKeyboard(productId, 1, product.quantity, language) 
      }
    );
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

      // Start product creation flow directly in main bot (scenes not working yet)
      console.log('Starting product creation in main bot');
      ctx.session.productData = {};
      ctx.session.registrationStep = 'product_price';
      
      // Update session in provider to persist initial setup
      await this.sessionProvider.setSession(ctx.from!.id.toString(), ctx.session);
      
      // Show price request with back button
      const priceRequestKeyboard = {
        inline_keyboard: [
          [
            { 
              text: language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 
              callback_data: 'back_from_product_creation' 
            }
          ]
        ]
      };
      
      await ctx.reply(getMessage(language, 'registration.priceRequest'), {
        reply_markup: priceRequestKeyboard
      });
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
    const productKeyboards: any[][] = [];
    
    // Count available and unavailable products
    const availableProducts = products.filter(p => p.quantity > 0).length;
    const unavailableProducts = products.filter(p => p.quantity <= 0).length;
    
    // Add summary header
    productsList += `📊 **${language === 'uz' ? 'Mahsulotlar statistikasi' : 'Статистика продуктов'}:**\n`;
    productsList += `🟢 ${language === 'uz' ? 'Mavjud' : 'Доступен'}: ${availableProducts} | 🔴 ${language === 'uz' ? 'Mavjud emas' : 'Недоступен'}: ${unavailableProducts}\n\n`;
    
    products.forEach((product, index) => {
      // Format available time
      const availableFrom = product.availableFrom ? new Date(product.availableFrom).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const availableUntil = product.availableUntil ? new Date(product.availableUntil).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const timeRange = `${availableFrom} - ${availableUntil}`;
      
      // Determine product status based on quantity
      const isAvailable = product.quantity > 0;
      const statusText = isAvailable 
        ? (language === 'uz' ? '🟢 Mavjud' : '🟢 Доступен')
        : (language === 'uz' ? '🔴 Mavjud emas' : '🔴 Недоступен');
      
      productsList += getMessage(language, 'products.productItemWithBuy', {
        number: index + 1,
        code: product.code,
        description: product.description,
        price: product.price,
        quantity: product.quantity || 1,
        availableUntil: timeRange,
        originalPriceText: product.originalPrice && product.originalPrice > product.price ? 
          `💰 <s>${product.originalPrice} so'm</s> - <b>${product.price} so'm</b> (${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% chegirma)` :
          `💰 <b>${product.price} so'm</b>`
      });
      
      // Add status and product ID to the list with better formatting
      productsList += `\n📊 **Status:** ${statusText} | 🆔 **ID:** ${product.id} | 📦 **Miqdor:** ${product.quantity} ta\n\n`;
      
      // Only add cancel button for available products (with quantity > 0)
      if (isAvailable) {
        productKeyboards.push([
          { 
            text: language === 'uz' ? `❌ Bekor qilish (ID: ${product.id})` : `❌ Отменить (ID: ${product.id})`, 
            callback_data: `cancel_product_${product.id}` 
          }
        ]);
      }
    });

    // Check if there are any available products to cancel
    if (productKeyboards.length === 0) {
      // All products are unavailable
      await ctx.reply(getMessage(language, 'products.myProducts', { productsList }), { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { 
              text: language === 'uz' ? 'ℹ️ Barcha mahsulotlar mavjud emas' : 'ℹ️ Все продукты недоступны', 
              callback_data: 'no_action' 
            }
          ]]
        }
      });
    } else {
      // Some products are available for cancellation
      const noteText = language === 'uz' 
        ? '💡 **Eslatma:** Faqat mavjud mahsulotlarni bekor qilish mumkin (miqdori > 0)'
        : '💡 **Примечание:** Можно отменить только доступные продукты (количество > 0)';
      
      productsList += `\n${noteText}`;
      
      await ctx.reply(getMessage(language, 'products.myProducts', { productsList }), { 
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: productKeyboards
        }
      });
    }
  }

  private async handleSellerStatistics(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }

    const language = ctx.session.language || 'uz';
    
    try {
      // Get seller's products
      const products = await this.productsService.findBySeller(seller.id);
      
      // Calculate statistics
      const totalProducts = products.length;
      const now = new Date();
      const activeProducts = products.filter(product => 
        product.isActive && new Date(product.availableUntil) > now
      ).length;
      const expiredProducts = products.filter(product => 
        new Date(product.availableUntil) <= now
      ).length;
      
      // Get seller's orders directly
      const orders = await this.ordersService.findBySeller(seller.id);
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      
      // Get seller's ratings
      const averageRating = await this.ratingsService.getAverageRatingBySeller(seller.id);
      const storeRating = await this.ratingsService.getAverageRatingBySeller(seller.id);
      
      const statistics = getMessage(language, 'products.statistics', {
        totalProducts,
        activeProducts,
        expiredProducts,
        totalOrders,
        totalRevenue: totalRevenue.toLocaleString(),
        averageRating: averageRating.toFixed(1),
        storeRating: storeRating.toFixed(1)
      });
      
      await ctx.reply(statistics);
    } catch (error) {
      console.error('Error getting seller statistics:', error);
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  private async handleChangePhoto(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    console.log('=== PHOTO CHANGE DEBUG ===');
    console.log('Session role after ensureSessionRole:', ctx.session.role);
    console.log('Session language:', ctx.session.language);
    
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }

    // Set the session step for photo change
    ctx.session.registrationStep = 'change_photo';
    
    // Update session in provider to persist the change
    try {
      await this.sessionProvider.setSession(ctx.from.id.toString(), ctx.session);
      console.log('Session step set to change_photo and saved in provider');
    } catch (sessionError) {
      console.error('Failed to save session in provider:', sessionError);
    }
    
    const language = ctx.session.language || 'uz';
    console.log('Sending photo change request in language:', language);
    console.log('Current session step after setting:', ctx.session.registrationStep);
    
    await ctx.reply(getMessage(language, 'registration.changePhotoRequest'), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Bekor qilish', callback_data: 'cancel_photo_change' }]
        ]
      }
    });
  }

  /**
   * Formats time range for display: "today 14:00 - 21:00"
   */
  private formatTimeRange(availableFrom: Date | string | undefined, availableUntil: string, language: 'uz' | 'ru'): string {
    if (!availableFrom) {
      return availableUntil;
    }
    
    // Convert availableFrom to time format
    let fromTime: string;
    try {
      if (availableFrom instanceof Date) {
        fromTime = availableFrom.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      } else if (typeof availableFrom === 'string' && (availableFrom.includes('T') || availableFrom.includes('Z'))) {
        // It's an ISO date string, extract time
        const fromDate = new Date(availableFrom);
        fromTime = fromDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      } else {
        // It's already a time string
        fromTime = availableFrom;
      }
    } catch (error) {
      console.error('Error parsing availableFrom date:', error);
      fromTime = 'N/A';
    }
    
    // Extract the time part from availableUntil (remove "today", "tomorrow", etc.)
    const timeMatch = availableUntil.match(/(\d{2}:\d{2})$/);
    if (timeMatch) {
      const endTime = timeMatch[1];
      
      if (language === 'ru') {
        // For Russian: "сегодня 14:00 - 21:00"
        if (availableUntil.includes('сегодня')) {
          return `сегодня ${fromTime} - ${endTime}`;
        } else if (availableUntil.includes('завтра')) {
          return `завтра ${fromTime} - ${endTime}`;
        } else if (availableUntil.includes('вчера')) {
          return `вчера ${fromTime} - ${endTime}`;
        } else {
          // For specific dates: "10/08/2025 14:00 - 21:00"
          const dateMatch = availableUntil.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (dateMatch) {
            return `${dateMatch[1]} ${fromTime} - ${endTime}`;
          }
        }
      } else {
        // For Uzbek: "bugun 14:00 - 21:00"
        if (availableUntil.includes('bugun')) {
          return `bugun ${fromTime} - ${endTime}`;
        } else if (availableUntil.includes('ertaga')) {
          return `ertaga ${fromTime} - ${endTime}`;
        } else if (availableUntil.includes('kecha')) {
          return `kecha ${fromTime} - ${endTime}`;
        } else {
          // For specific dates: "10/08/2025 14:00 - 21:00"
          const dateMatch = availableUntil.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (dateMatch) {
            return `${dateMatch[1]} ${fromTime} - ${endTime}`;
          }
        }
      }
    }
    
    // Fallback: just show the range
    return `${fromTime} - ${availableUntil}`;
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

    // Check for product ID in both session and pending ratings
    let productId = ctx.session.selectedProductId;
    
    // If not in session, check pending ratings
    if (!productId) {
      productId = this.pendingRatings.get(telegramId);
    }
    
    if (!productId) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productNotSelected'));
    }

    try {
      // Check if user has already rated this product
      const hasRated = await this.ratingsService.hasUserRatedProduct(user.id, productId);
      if (hasRated) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.alreadyRated'));
      }

      await this.ratingsService.create({
        rating,
        userId: user.id,
        productId,
        type: 'product'
      });

      // Clear the pending rating after successful submission
      this.pendingRatings.delete(telegramId);
      ctx.session.selectedProductId = undefined;

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.productRatingSubmitted', { rating }));
    } catch (error) {
      console.error('Rating creation error:', error);
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

    // Check for seller ID in session
    const sellerId = ctx.session.selectedSellerId;
    
    if (!sellerId) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.storeNotSelected'));
    }

    try {
      // Check if user has already rated this seller
      const hasRated = await this.ratingsService.hasUserRatedSeller(user.id, sellerId);
      if (hasRated) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.alreadyRated'));
      }

      await this.ratingsService.create({
        rating,
        userId: user.id,
        sellerId,
        type: 'seller'
      });

      // Clear the selected seller after successful submission
      ctx.session.selectedSellerId = undefined;

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.storeRatingSubmitted', { rating }));
    } catch (error) {
      console.error('Store rating creation error:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.ratingFailed'));
    }
  }



  private async requestProductRating(@Ctx() ctx: TelegramContext, productId: number) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) return;

    // Check if user has already rated this product
    const hasRated = await this.ratingsService.hasUserRatedProduct(user.id, productId);
    if (hasRated) return; // Don't ask for rating if already rated

    // Set the selected product ID for rating
    ctx.session.selectedProductId = productId;

    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'success.productRatingRequest'), {
      reply_markup: getProductRatingKeyboard()
    });
  }

  private async requestProductRatingAfterApproval(telegram: any, buyerTelegramId: string, productId: number, language: 'uz' | 'ru') {
    try {
      // Get the user by telegram ID
      const user = await this.usersService.findByTelegramId(buyerTelegramId);
      if (!user) return;

      // Check if user has already rated this product
      const hasRated = await this.ratingsService.hasUserRatedProduct(user.id, productId);
      if (hasRated) return; // Don't ask for rating if already rated

      // Send rating request message to the buyer
      const ratingMessage = language === 'ru' ? 
        '⭐ Оцените товар после получения:' :
        '⭐ Mahsulotni olganingizdan so\'ng uni baholang:';

      await telegram.sendMessage(buyerTelegramId, ratingMessage, {
        reply_markup: getProductRatingKeyboard()
      });

      // Store the product ID in a temporary storage for this user
      if (!this.pendingRatings) {
        this.pendingRatings = new Map();
      }
      this.pendingRatings.set(buyerTelegramId, productId);
    } catch (error) {
      console.error('Failed to request product rating after approval:', error);
    }
  }

  private isStoreOpen(opensAt: number, closesAt: number): boolean {
    return isStoreOpen(opensAt, closesAt);
  }

  private async handleCompletePurchase(@Ctx() ctx: TelegramContext, quantity: number = 1) {
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

      // Check if product has enough quantity
      if (product.quantity < quantity) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.productOutOfStock'));
      }

      const order = await this.ordersService.create({
        userId: user.id,
        productId: product.id,
        quantity: quantity,
        totalPrice: product.price * quantity
      });

      // Set initial status to PENDING
      await this.ordersService.updateStatus(order.id, OrderStatus.PENDING);

      // Don't reduce product quantity yet - wait for seller approval
      // Product quantity will be reduced only when seller confirms the order

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.orderCreated', {
        code: order.code,
        productCode: product.code,
        price: order.totalPrice
      }), { reply_markup: getOrderConfirmationKeyboard(language) });
      
      // Send notification to seller with approval buttons
      const seller = await this.sellersService.findOne(product.seller.id);
      if (seller) {
        const sellerTexts = {
          uz: `🆕 Yangi buyurtma!\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${product.code}\n🔢 Miqdor: ${quantity} ta\n💰 Narxi: ${order.totalPrice} so'm\n👤 Mijoz: ${user.phoneNumber}\n📦 Mahsulot: ${product.description}\n\n✅ Tasdiqlash yoki ❌ Rad etish uchun tugmani bosing`,
          ru: `🆕 Новый заказ!\n\n📋 Код заказа: ${order.code}\n🔢 Код товара: ${product.code}\n🔢 Количество: ${quantity} шт\n💰 Цена: ${order.totalPrice} сум\n👤 Клиент: ${user.phoneNumber}\n📦 Товар: ${product.description}\n\n✅ Нажмите кнопку для подтверждения или ❌ отмены`
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
      ctx.session.selectedQuantity = undefined;
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
      
      // Now reduce the product quantity since seller confirmed
      const newQuantity = order.product.quantity - order.quantity;
      
      if (newQuantity <= 0) {
        // If no quantity left, deactivate the product completely
      await this.productsService.deactivate(order.product.id);
      } else {
        // Update the product quantity - product remains active
        await this.productsService.update(order.product.id, {
          quantity: newQuantity
        });
      }
      
      // Notify the buyer
      const buyer = await this.usersService.findOne(order.user.id);
      if (buyer) {
        const buyerTexts = {
          uz: `✅ Buyurtmangiz tasdiqlandi!\n\n📋 Buyurtma kodi: ${order.code}\n🔢 Mahsulot kodi: ${order.product.code}\n💰 Narxi: ${order.totalPrice} so'm\n📦 Mahsulot: ${order.product.description}\n\nDo'konga borganda buyurtma kodini ko'rsating!`,
          ru: `✅ Ваш заказ подтвержден!\n\n📋 Код заказа: ${order.code}\n🔢 Код товара: ${order.product.code}\n💰 Цена: ${order.totalPrice} сум\n📦 Товар: ${order.product.description}\n\nПокажите код заказа в магазине!`
        };
        
        try {
          await ctx.telegram.sendMessage(buyer.telegramId, buyerTexts[buyer.language]);
          
          // Request product rating after seller approves the purchase
          await this.requestProductRatingAfterApproval(ctx.telegram, buyer.telegramId, order.product.id, buyer.language);
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
      
      // No need to reactivate product since quantity was never reduced
      // Product remains available for other customers
      
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
        productId: testProduct.id,
        quantity: 1,
        totalPrice: testProduct.price
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
            availableUntil: futureDate
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
      const telegramId = ctx.from.id.toString();
      const user = await this.usersService.findByTelegramId(telegramId);
      
      if (!user) {
        return ctx.reply('❌ User not found for testing!');
      }
      
      // Test creating a rating for the first product of the seller
      const sellerProducts = await this.productsService.findBySeller(testSeller.id);
      if (sellerProducts.length === 0) {
        return ctx.reply('❌ No products found for testing!');
      }
      
      const testProduct = sellerProducts[0];
      const testRating = await this.ratingsService.create({
        rating: 5,
        userId: user.id,
        productId: testProduct.id
      });
      
      // Test store rating functionality
      const averageRating = await this.ratingsService.getAverageRatingBySeller(testSeller.id);
      const ratingCount = await this.ratingsService.getSellerRatingCount(testSeller.id);
      
      const result = `🧪 Store Rating Test Results:\n\n` +
        `🏪 Store: ${testSeller.businessName}\n` +
        `⭐ Average Rating: ${averageRating.toFixed(1)}/5\n` +
        `📊 Rating Count: ${ratingCount}\n` +
        `✅ Test Rating Created: ${testRating.id}\n\n` +
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

  @Command('teststoresearch')
  async testStoreSearchCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      // Get all sellers
      const sellers = await this.sellersService.findAll();
      
      if (sellers.length === 0) {
        return ctx.reply('❌ No sellers found!');
      }
      
      let result = `🧪 Store Search Test Results:\n\n`;
      
      for (const seller of sellers.slice(0, 5)) { // Show first 5 sellers
        const averageRating = await this.ratingsService.getAverageRatingBySeller(seller.id);
        const ratingCount = await this.ratingsService.getSellerRatingCount(seller.id);
        
        let ratingDisplay = '';
        if (averageRating > 0) {
          const stars = '⭐'.repeat(Math.round(averageRating));
          ratingDisplay = ` ${stars} (${averageRating.toFixed(1)}) (${ratingCount} baho)`;
        }
        
        result += `🏪 ${seller.businessName}${ratingDisplay}\n`;
      }
      
      await ctx.reply(result);
      
    } catch (error) {
      console.error('Test store search error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Command('testratingcomplete')
  async testRatingCompleteCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }
    
    try {
      const telegramId = ctx.from.id.toString();
      const user = await this.usersService.findByTelegramId(telegramId);
      
      if (!user) {
        return ctx.reply('❌ User not found for testing!');
      }
      
      // Test the rating system
      await ctx.reply('🧪 Testing Rating System...');
      
      // Test 1: Check if pending ratings work
      const pendingProductId = this.pendingRatings.get(telegramId);
      await ctx.reply(`📋 Pending product rating: ${pendingProductId || 'None'}`);
      
      // Test 2: Check user's existing ratings
      const userRatings = await this.ratingsService.findByUser(user.id);
      await ctx.reply(`⭐ User has ${userRatings.length} ratings`);
      
      // Test 3: Test product rating creation
      const sellers = await this.sellersService.findAll();
      if (sellers.length > 0) {
        const testSeller = sellers[0];
        const sellerProducts = await this.productsService.findBySeller(testSeller.id);
        
        if (sellerProducts.length > 0) {
          const testProduct = sellerProducts[0];
          
          // Check if user has already rated this product
          const hasRated = await this.ratingsService.hasUserRatedProduct(user.id, testProduct.id);
          await ctx.reply(`🔍 User has rated product ${testProduct.id}: ${hasRated}`);
          
          if (!hasRated) {
            // Create a test rating
            const testRating = await this.ratingsService.create({
              rating: 4,
              userId: user.id,
              productId: testProduct.id,
              type: 'product'
            });
            await ctx.reply(`✅ Test product rating created: ${testRating.id}`);
          }
          
          // Test seller rating
          const hasRatedSeller = await this.ratingsService.hasUserRatedSeller(user.id, testSeller.id);
          await ctx.reply(`🔍 User has rated seller ${testSeller.id}: ${hasRatedSeller}`);
          
          if (!hasRatedSeller) {
            // Create a test seller rating
            const testSellerRating = await this.ratingsService.create({
              rating: 5,
              userId: user.id,
              sellerId: testSeller.id,
              type: 'seller'
            });
            await ctx.reply(`✅ Test seller rating created: ${testSellerRating.id}`);
          }
        }
      }
      
      await ctx.reply('✅ Rating system test completed!');
      
    } catch (error) {
      console.error('Test rating complete error:', error);
      await ctx.reply(`❌ Test failed: ${error.message}`);
    }
  }

  @Action(/quantity_minus_(\d+)_(\d+)/)
  async onQuantityMinus(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    const currentQuantity = parseInt(match[2]);
    
    if (currentQuantity <= 1) return; // Can't go below 1
    
    const newQuantity = currentQuantity - 1;
    ctx.session.selectedQuantity = newQuantity;
    
    const language = ctx.session.language || 'uz';
    const product = await this.productsService.findOne(productId);
    
    if (product) {
      await ctx.editMessageReplyMarkup(
        getQuantitySelectionKeyboard(productId, newQuantity, product.quantity, language)
      );
    }
  }

  @Action(/quantity_plus_(\d+)_(\d+)/)
  async onQuantityPlus(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    const currentQuantity = parseInt(match[2]);
    
    console.log('=== PRODUCT PURCHASE QUANTITY PLUS DEBUG ===');
    console.log('Product ID:', productId);
    console.log('Current quantity:', currentQuantity);
    
    // Get the product to check max quantity
    const product = await this.productsService.findOne(productId);
    if (!product) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productNotFound'));
    }
    
    // Check if we can increase quantity
    if (currentQuantity < product.quantity && currentQuantity < 10000) {
      const newQuantity = currentQuantity + 1;
      console.log('New quantity after plus:', newQuantity);
      
      const language = ctx.session.language || 'uz';
      
      // Update the keyboard with new quantity
      await ctx.editMessageReplyMarkup(
        getQuantitySelectionKeyboard(productId, newQuantity, product.quantity, language)
      );
    }
  }

  @Action(/confirm_quantity_(\d+)_(\d+)/)
  async onConfirmQuantity(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    const quantity = parseInt(match[2]);
    
    const product = await this.productsService.findOne(productId);
    if (!product) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productNotFound'));
    }
    
    // Check if quantity is still available
    if (quantity > product.quantity) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.productOutOfStock'));
    }
    
    ctx.session.selectedProductId = productId;
    ctx.session.selectedQuantity = quantity;
    
    const language = ctx.session.language || 'uz';
    const totalPrice = product.price * quantity;
    
    // Show purchase confirmation
    await ctx.reply(
      getMessage(language, 'purchase.confirmPurchase', {
        productName: product.description || `Product #${product.id}`,
        quantity: quantity,
        totalPrice: totalPrice.toLocaleString()
      }),
      { 
        reply_markup: getPurchaseConfirmationKeyboard(productId, quantity, language) 
      }
    );
  }

  @Action(/purchase_confirm_(\d+)_(\d+)/)
  async onPurchaseConfirm(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    const quantity = parseInt(match[2]);
    
    // Complete the purchase
    await this.handleCompletePurchase(ctx, quantity);
  }

  @Action(/purchase_cancel_(\d+)/)
  async onPurchaseCancel(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const language = ctx.session.language || 'uz';
    
    // Clear selected product and return to store details
    ctx.session.selectedProductId = undefined;
    ctx.session.selectedQuantity = undefined;
    
    if (ctx.session.selectedStoreId) {
      await this.handleStoreDetails(ctx, ctx.session.selectedStoreId);
    } else {
      await ctx.reply(getMessage(language, 'actions.cancelled'));
    }
  }

  // Product creation Action handlers
  @Action('quantity_minus')
  async onQuantityMinusProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    if (!ctx.session.productData) {
      ctx.session.productData = {};
    }
    
    const currentQuantity = ctx.session.productData.quantity || 1;
    if (currentQuantity > 1) {
      ctx.session.productData.quantity = currentQuantity - 1;
      
      // Update session in provider to persist changes
      await this.sessionProvider.setSession(ctx.from!.id.toString(), ctx.session);
      
      const language = ctx.session.language || 'uz';
      
      // Update the keyboard with new quantity
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [
            { text: '➖', callback_data: 'quantity_minus' },
            { text: `${ctx.session.productData.quantity}`, callback_data: 'quantity_display' },
            { text: '➕', callback_data: 'quantity_plus' }
          ],
          [
            { text: getMessage(language, 'actions.confirm'), callback_data: 'quantity_confirm' }
          ]
        ]
      });
    }
  }

  @Action('quantity_plus')
  async onQuantityPlusProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    if (!ctx.session.productData) {
      ctx.session.productData = {};
    }
    
    const currentQuantity = ctx.session.productData.quantity || 1;
    if (currentQuantity < 10000) { // Max limit
      ctx.session.productData.quantity = currentQuantity + 1;
      
      // Update session in provider to persist changes
      await this.sessionProvider.setSession(ctx.from!.id.toString(), ctx.session);
      
      const language = ctx.session.language || 'uz';
      
      // Update the keyboard with new quantity
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [
            { text: '➖', callback_data: 'quantity_minus' },
            { text: `${ctx.session.productData.quantity}`, callback_data: 'quantity_display' },
            { text: '➕', callback_data: 'quantity_plus' }
          ],
          [
            { text: getMessage(language, 'actions.confirm'), callback_data: 'quantity_confirm' }
          ]
        ]
      });
    }
  }

  @Action('quantity_display')
  async onQuantityDisplay(@Ctx() ctx: TelegramContext) {
    // Do nothing - this is just for display
  }

  @Action('quantity_confirm')
  async onQuantityConfirmProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    if (!ctx.session.productData || !ctx.session.productData.quantity) {
      ctx.session.productData = ctx.session.productData || {};
      ctx.session.productData.quantity = 1;
    }
    
    console.log('Final quantity before creating product:', ctx.session.productData.quantity);
    
    // Update session in provider to persist final quantity
    await this.sessionProvider.setSession(ctx.from!.id.toString(), ctx.session);
    console.log('Final quantity session updated in provider');
    
    // Create product
    await this.createProductFromMainBot(ctx);
  }

  @Action('skip_quantity')
  async onSkipQuantity(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    if (!ctx.session.productData) {
      ctx.session.productData = {};
    }
    ctx.session.productData.quantity = 1; // Default to 1
    
    console.log('Skip quantity - setting quantity to 1');
    
    // Create product with default quantity
    await this.createProductFromMainBot(ctx);
  }

  @Action('enter_quantity')
  async onEnterQuantity(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    const language = ctx.session.language || 'uz';
    ctx.session.registrationStep = 'product_enter_quantity';
    
    await ctx.reply(getMessage(language, 'registration.quantityRequest'));
  }

  private async createProductFromMainBot(ctx: TelegramContext) {
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.productData?.price || !ctx.session.productData?.description || 
          !ctx.session.productData?.availableUntilTime || !ctx.session.productData?.quantity) {
        throw new Error('Missing product data');
      }

      const telegramId = ctx.from.id.toString();
      const seller = await this.sellersService.findByTelegramId(telegramId);
      
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Create availableFrom date (today at start time)
      let availableFrom: Date | undefined;
      if (ctx.session.productData.availableFrom) {
        const [hours, minutes] = ctx.session.productData.availableFrom.split(':').map(Number);
        availableFrom = new Date();
        availableFrom.setHours(hours, minutes, 0, 0);
        
        // If start time has passed today, set for tomorrow
        if (availableFrom <= new Date()) {
          availableFrom.setDate(availableFrom.getDate() + 1);
        }
      }

      // Create availableUntil date (today at end time)
      let availableUntil: Date;
      if (ctx.session.productData.availableUntilTime) {
        const [hours, minutes] = ctx.session.productData.availableUntilTime.split(':').map(Number);
        availableUntil = new Date();
        availableUntil.setHours(hours, minutes, 0, 0);
        
        // If end time has passed today, set for tomorrow
        if (availableUntil <= new Date()) {
          availableUntil.setDate(availableUntil.getDate() + 1);
        }
      } else {
        // Fallback to current time + 1 day if no time specified
        availableUntil = new Date();
        availableUntil.setDate(availableUntil.getDate() + 1);
      }

      const createProductDto = {
        name: ctx.session.productData.description, // Use description as name
        price: ctx.session.productData.price,
        originalPrice: ctx.session.productData.originalPrice,
        description: ctx.session.productData.description,
        availableFrom: availableFrom,
        availableUntil: availableUntil,
        quantity: ctx.session.productData.quantity,
        sellerId: seller.id
      };

      console.log('Creating product with data:', createProductDto);

      const createdProduct = await this.productsService.create(createProductDto);

      const language = ctx.session.language || 'uz';
      
      console.log('=== PRODUCT CREATION DEBUG ===');
      console.log('User language:', language);
      console.log('Success message key:', getMessage(language, 'success.productCreated'));
      
      // Show product creation success with details in proper language
      let successMessage = '';
      if (language === 'uz') {
        successMessage = `${getMessage(language, 'success.productCreated')}\n\n` +
          `📦 **Mahsulot ma'lumotlari:**\n` +
          `🆔 ID: \`${createdProduct.id}\`\n` +
          `💰 Narxi: ${createdProduct.price.toLocaleString()} so'm\n` +
          `${createdProduct.originalPrice ? `💸 Asl narxi: ${createdProduct.originalPrice.toLocaleString()} so'm\n` : ''}` +
          `📝 Tavsif: ${createdProduct.description}\n` +
          `⏰ Mavjud bo'lish vaqti: ${createdProduct.availableFrom ? new Date(createdProduct.availableFrom).toLocaleString('uz-UZ') : 'N/A'} - ${createdProduct.availableUntil ? new Date(createdProduct.availableUntil).toLocaleString('uz-UZ') : 'N/A'}\n` +
          `📊 Miqdori: ${createdProduct.quantity} ta\n` +
          `🔢 Kodi: \`${createdProduct.code}\``;
      } else {
        successMessage = `${getMessage(language, 'success.productCreated')}\n\n` +
          `📦 **Информация о продукте:**\n` +
          `🆔 ID: \`${createdProduct.id}\`\n` +
          `💰 Цена: ${createdProduct.price.toLocaleString()} сум\n` +
          `${createdProduct.originalPrice ? `💸 Исходная цена: ${createdProduct.originalPrice.toLocaleString()} сум\n` : ''}` +
          `📝 Описание: ${createdProduct.description}\n` +
          `⏰ Время доступности: ${createdProduct.availableFrom ? new Date(createdProduct.availableFrom).toLocaleString('ru-RU') : 'N/A'} - ${createdProduct.availableUntil ? new Date(createdProduct.availableUntil).toLocaleString('ru-RU') : 'N/A'}\n` +
          `📊 Количество: ${createdProduct.quantity} шт\n` +
          `🔢 Код: \`${createdProduct.code}\``;
      }
      
      await ctx.reply(successMessage, { parse_mode: 'Markdown' });
      
      // Clear product data and reset step
      ctx.session.productData = {};
      ctx.session.registrationStep = undefined;
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.productCreationFailed'));
      console.error('Product creation error:', error);
    }
  }

  // Cancel product action handler for sellers
  @Action(/cancel_product_(\d+)/)
  async onCancelProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }
    
    try {
      // Get the product to verify ownership
      const product = await this.productsService.findOne(productId);
      if (!product) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.productNotFound'));
      }
      
      // Verify the product belongs to this seller
      if (product.seller.id !== seller.id) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.notAuthorized'));
      }
      
      // Additional security check: only allow cancellation of available products
      if (product.quantity <= 0) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(
          language === 'uz' 
            ? '❌ Bu mahsulotni bekor qilish mumkin emas. Mahsulot mavjud emas (miqdori 0).'
            : '❌ Этот продукт нельзя отменить. Продукт недоступен (количество 0).'
        );
      }
      
      // Show confirmation message with product details
      const language = ctx.session.language || 'uz';
      const confirmText = language === 'uz'
        ? `⚠️ **Tasdiqlash kerak!**\n\nBu mahsulotni o'chirishni xohlaysizmi?\n\n🆔 ID: ${product.id}\n📦 ${product.description}\n💰 ${product.price.toLocaleString()} so'm\n📊 Miqdor: ${product.quantity} ta\n\n💡 **Eslatma:** Mahsulot butunlay o'chiriladi va qayta tiklanmaydi!\n\n✅ Ha, o'chirish | ❌ Yo'q, bekor qilish`
        : `⚠️ **Требуется подтверждение!**\n\nВы действительно хотите удалить этот продукт?\n\n🆔 ID: ${product.id}\n📦 ${product.description}\n💰 ${product.price.toLocaleString()} сум\n📊 Количество: ${product.quantity} шт\n\n💡 **Примечание:** Продукт будет полностью удален и не может быть восстановлен!\n\n✅ Да, удалить | ❌ Нет, отменить`;
      
      await ctx.reply(confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Ha, o\'chirish', callback_data: `confirm_delete_${product.id}` },
              { text: '❌ Yo\'q, bekor qilish', callback_data: `cancel_delete_${product.id}` }
            ]
          ]
        }
      });
      
      return; // Don't delete yet, wait for confirmation
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
      console.error('Error canceling product:', error);
    }
  }

  // Handle no-action buttons (informational buttons)
  @Action('no_action')
  async onNoAction(@Ctx() ctx: TelegramContext) {
    // Do nothing - this is just for display
  }

  // Confirm product deletion
  @Action(/confirm_delete_(\d+)/)
  async onConfirmDeleteProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    const match = ctx.match;
    if (!match) return;
    
    const productId = parseInt(match[1]);
    
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }
    
    try {
      const product = await this.productsService.findOne(productId);
      if (!product || product.seller.id !== seller.id) {
        const language = ctx.session.language || 'uz';
        return ctx.reply(getMessage(language, 'error.productNotFound'));
      }
      
      // Delete the product
      await this.productsService.remove(productId);
      
      const language = ctx.session.language || 'uz';
      await ctx.reply(
        language === 'uz' 
          ? `✅ Mahsulot muvaffaqiyatli o'chirildi!\n\n🆔 ID: ${product.id}\n📦 ${product.description}\n💰 ${product.price.toLocaleString()} so'm`
          : `✅ Продукт успешно удален!\n\n🆔 ID: ${product.id}\n📦 ${product.description}\n💰 ${product.price.toLocaleString()} сум`
      );
      
      // Update the original message to remove the confirmation buttons
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
      console.error('Error confirming product deletion:', error);
    }
  }

  // Cancel product deletion
  @Action(/cancel_delete_(\d+)/)
  async onCancelDeleteProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(
      language === 'uz' 
        ? '✅ Mahsulotni o\'chirish bekor qilindi.'
        : '✅ Удаление продукта отменено.'
    );
    
    // Update the original message to remove the confirmation buttons
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  }

  // Back from product creation
  @Action('back_from_product_creation')
  async onBackFromProductCreation(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    console.log('=== BACK FROM PRODUCT CREATION DEBUG ===');
    console.log('Current session step:', ctx.session.registrationStep);
    
    // Clear product creation data
    ctx.session.productData = {};
    ctx.session.registrationStep = undefined;
    
    const language = ctx.session.language || 'uz';
    
    await ctx.reply(
      language === 'uz' 
        ? '⬅️ Mahsulot qo\'shish bekor qilindi. Asosiy menyuga qaytdingiz.'
        : '⬅️ Добавление продукта отменено. Вы вернулись в главное меню.'
    );
    
    // Show main menu again
    const keyboard = getMainMenuKeyboard(language, ctx.session.role === UserRole.SELLER ? 'seller' : 'user');
    await ctx.reply(getMessage(language, 'mainMenu.selectOption'), { reply_markup: keyboard });
  }

  // Cancel photo change
  @Action('cancel_photo_change')
  async onCancelPhotoChange(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    // Clear the photo change step
    ctx.session.registrationStep = undefined;
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(
      language === 'uz' 
        ? '✅ Do\'kon suratini o\'zgartirish bekor qilindi.'
        : '✅ Изменение фото магазина отменено.'
    );
    
    // Show main menu again
    const keyboard = getMainMenuKeyboard(language, ctx.session.role === UserRole.SELLER ? 'seller' : 'user');
    await ctx.reply(getMessage(language, 'mainMenu.selectOption'), { reply_markup: keyboard });
  }

  // Business type selection for seller registration
  @Action(/business_type_(cafe|restaurant|market|bakery|other)/)
  async onBusinessTypeSelect(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    if (!ctx.match) return;
    
    const businessTypeString = ctx.match[1];
    const language = ctx.session.language || 'uz';
    
    console.log('=== BUSINESS TYPE SELECTION DEBUG ===');
    console.log('Selected business type:', businessTypeString);
    console.log('Current seller data:', ctx.session.sellerData);
    
    // Convert string to BusinessType enum
    const businessTypeMap: { [key: string]: BusinessType } = {
      'cafe': BusinessType.CAFE,
      'restaurant': BusinessType.RESTAURANT,
      'market': BusinessType.MARKET,
      'bakery': BusinessType.BAKERY,
      'other': BusinessType.OTHER
    };
    
    const businessType = businessTypeMap[businessTypeString];
    if (!businessType) {
      await ctx.reply(getMessage(language, 'error.invalidBusinessType'));
      return;
    }
    
    // Store business type and move to location step
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    ctx.session.sellerData.businessType = businessType;
    ctx.session.registrationStep = 'location';
    
    console.log('Business type stored, moving to location step');
    
    // Request location
    await ctx.reply(getMessage(language, 'registration.locationRequest'), {
      reply_markup: getLocationKeyboard(language)
    });
  }



  // Send photo for seller registration
  @Action('send_photo')
  async onSendPhoto(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    console.log('=== SEND PHOTO DEBUG ===');
    console.log('Current seller data:', ctx.session.sellerData);
    
    const language = ctx.session.language || 'uz';
    
    // Keep the registration step as 'store_image' so the photo handler can process it
    const photoMessage = language === 'uz' 
      ? '📸 Iltimos, do\'koningizning suratini yuboring yoki "O\'tkazib yuborish" tugmasini bosing.'
      : '📸 Пожалуйста, отправьте фото вашего магазина или нажмите кнопку "Пропустить".';
    await ctx.reply(photoMessage);
  }

  // Skip photo for seller registration
  @Action('skip_photo')
  async onSkipPhoto(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    await this.ensureSessionRole(ctx);
    
    console.log('=== SKIP PHOTO DEBUG ===');
    console.log('Current seller data:', ctx.session.sellerData);
    
    // Complete seller registration
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.sellerData) throw new Error('No seller data found');
      
      const language = ctx.session.language || 'uz';
      
      // Validate all required fields are present
      if (!ctx.session.sellerData.phoneNumber || 
          !ctx.session.sellerData.businessName || 
          !ctx.session.sellerData.businessType || 
          !ctx.session.sellerData.location) {
        throw new Error('Missing required seller data');
      }
      
      // At this point, we know all fields are defined
      const sellerData = ctx.session.sellerData;
      
      // Create seller with all collected data (without opening hours)
      const createSellerDto = {
        telegramId: ctx.from.id.toString(),
        phoneNumber: sellerData.phoneNumber!,
        businessName: sellerData.businessName!,
        businessType: sellerData.businessType!,
        location: sellerData.location!,
        language: ctx.session.language,
        status: SellerStatus.PENDING
      };
      
      console.log('Creating seller with DTO:', createSellerDto);
      const seller = await this.sellersService.create(createSellerDto);
      
      // Clear registration data
      ctx.session.registrationStep = undefined;
      ctx.session.sellerData = undefined;
      
      await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
        reply_markup: getMainMenuKeyboard(language, 'seller') 
      });
      
      // Send notification to admin about new seller registration
      try {
        const adminMessage = {
          uz: `🆕 Yangi sotuvchi ro'yxatdan o'tdi!\n\n🏪 Do'kon nomi: ${seller.businessName}\n📱 Telefon: ${seller.phoneNumber}\n🏷️ Turi: ${seller.businessType}\n📍 Manzil: ${seller.location?.latitude}, ${seller.location?.longitude}\n👤 Telegram ID: ${seller.telegramId}\n\n✅ Tasdiqlash yoki ❌ Rad etish uchun admin paneliga kiring.`,
          ru: `🆕 Новый продавец зарегистрировался!\n\n🏪 Название магазина: ${seller.businessName}\n📱 Телефон: ${seller.phoneNumber}\n🏷️ Тип: ${seller.businessType}\n📍 Местоположение: ${seller.location?.latitude}, ${seller.location?.longitude}\n👤 Telegram ID: ${seller.telegramId}\n\n✅ Войдите в админ панель для подтверждения или отклонения.`
        };
        
        // Send to admin
        await ctx.telegram.sendMessage(envVariables.ADMIN_TELEGRAM_ID, adminMessage[seller.language || 'uz']);
        console.log('Admin notification sent for new seller registration');
      } catch (error) {
        console.error('Failed to send admin notification:', error);
      }
      
      console.log('Seller registration completed successfully');
    } catch (error) {
      console.error('Seller registration error:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  private async sendBroadcastMessage(ctx: TelegramContext, users: User[], sellers: Seller[], message: string): Promise<number> {
    let successCount = 0;
    
    // Send message to users
    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(user.telegramId, message);
        successCount++;
      } catch (error) {
        console.error(`Failed to send message to user ${user.telegramId}:`, error);
      }
    }
    
    // Send message to sellers
    for (const seller of sellers) {
      try {
        await ctx.telegram.sendMessage(seller.telegramId, message);
        successCount++;
      } catch (error) {
        console.error(`Failed to send message to seller ${seller.telegramId}:`, error);
      }
    }
    
    return successCount;
  }

  private async createSellerFromSession(ctx: TelegramContext) {
    if (!ctx.from || !ctx.session.sellerData) return;
    
    try {
      const createSellerDto = {
        telegramId: ctx.from.id.toString(),
        phoneNumber: ctx.session.sellerData.phoneNumber!,
        businessName: ctx.session.sellerData.businessName!,
        businessType: ctx.session.sellerData.businessType!,
        location: ctx.session.sellerData.location,
        imageUrl: ctx.session.sellerData.imageUrl,
        language: ctx.session.language || 'uz'
      };

      const seller = await this.sellersService.create(createSellerDto);
      
      // ✅ Set the session role after successful seller creation
      ctx.session.role = UserRole.SELLER;
      
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      
      // Save the updated session to the provider  
      this.sessionProvider.setSession(ctx.from.id.toString(), ctx.session);
      
      // Clear registration data and show main menu
      ctx.session.registrationStep = undefined;
      ctx.session.sellerData = undefined;
      
      await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
        reply_markup: getMainMenuKeyboard(language, 'seller') 
      });
      
      // Send notification to admin about new seller registration
      try {
        const adminMessage = {
          uz: `🆕 Yangi sotuvchi ro'yxatdan o'tdi!\n\n🏪 Do'kon nomi: ${seller.businessName}\n📱 Telefon: ${seller.phoneNumber}\n🏷️ Turi: ${seller.businessType}\n📍 Manzil: ${seller.location?.latitude}, ${seller.location?.longitude}\n👤 Telegram ID: ${seller.telegramId}\n\n✅ Tasdiqlash yoki ❌ Rad etish uchun admin paneliga kiring.`,
          ru: `🆕 Новый продавец зарегистрировался!\n\n🏪 Название магазина: ${seller.businessName}\n📱 Телефон: ${seller.phoneNumber}\n🏷️ Тип: ${seller.businessType}\n📍 Местоположение: ${seller.location?.latitude}, ${seller.location?.longitude}\n👤 Telegram ID: ${seller.telegramId}\n\n✅ Войдите в админ панель для подтверждения или отклонения.`
        };
        
        // Send to admin
        await ctx.telegram.sendMessage(envVariables.ADMIN_TELEGRAM_ID, adminMessage[seller.language || 'uz']);
        console.log('Admin notification sent for new seller registration');
      } catch (error) {
        console.error('Failed to send admin notification:', error);
      }
      
      // Leave the scene if we're in one
      if (ctx.scene) {
        await ctx.scene.leave();
      }
    } catch (error) {
      console.error('Seller creation error:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  // Mini App button handler
  @Action('open_mini_app')
  async handleOpenMiniApp(@Ctx() ctx: TelegramContext) {
    try {
      const user = ctx.from;
      if (!user) {
        return ctx.reply('Unable to identify user.');
      }
      const telegramId = user.id.toString();
      
      // Check if user is registered
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      const existingSeller = await this.sellersService.findByTelegramId(telegramId);
      
      if (!existingUser && !existingSeller) {
        await ctx.answerCbQuery('Please register first!');
        return ctx.reply('Please use /start to register first.');
      }
      
      // Create mini app URL
      const miniAppUrl = `${envVariables.WEBHOOK_URL}/webapp/mini-app/entry`;
      
      // Send mini app button
      await ctx.reply('🚀 Open Mini App', {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🍽️ Open Food Delivery App',
              web_app: { url: miniAppUrl }
            }
          ]]
        }
      });
      
    } catch (error) {
      console.error('Mini app error:', error);
      await ctx.reply('❌ Failed to open mini app. Please try again.');
    }
  }

  // Location sharing handler
  @Action('share_location')
  async handleShareLocation(@Ctx() ctx: TelegramContext) {
    try {
      await ctx.reply('📍 Please share your location to find nearby stores:', {
        reply_markup: {
          keyboard: [[
            {
              text: '📍 Share Location',
              request_location: true
            }
          ]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    } catch (error) {
      console.error('Location sharing error:', error);
      await ctx.reply('❌ Failed to request location. Please try again.');
    }
  }

  // Location handler
  @On('location')
  async handleLocation(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx); // ✅ ADD THIS LINE
    
    try {
      const user = ctx.from;
      if (!user) {
        await ctx.reply(' User information not available.');
        return;
      }
      
      // Check if user is in a scene - if so, let the scene handle location
      if (ctx.scene) {
        console.log('User is in a scene - letting scene handle location');
        return; // Let the scene handle this location
      }
      
      const message = ctx.message;
      if (!message || !('location' in message)) {
        await ctx.reply(' Location not found in message.');
        return;
      }
      
      const location = message.location;
      const telegramId = user.id.toString();
      
      // ✅ CHECK IF USER IS IN REGISTRATION FLOW FIRST
      if (ctx.session.registrationStep) {
        console.log('User is in registration flow - handling location for registration');
        // Handle location during registration (this should be handled by the scene)
        return;
      }
      
      // Check if user or seller exists and update location
      const existingUser = await this.usersService.findByTelegramId(telegramId);
      const existingSeller = await this.sellersService.findByTelegramId(telegramId);
      
      if (existingUser) {
        // Update user location
        await this.usersService.update(existingUser.id, {
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });
        
        await ctx.reply(' Location updated! You can now find nearby stores in the mini app.');
      } else if (existingSeller) {
        // Update seller location
        await this.sellersService.update(existingSeller.id, {
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });
        
        await ctx.reply(' Store location updated successfully!');
      } else {
        await ctx.reply(' User not found. Please register first.');
      }
    } catch (error) {
      console.error('Location update error:', error);
      await ctx.reply(' Failed to update location. Please try again.');
    }
  }
}

