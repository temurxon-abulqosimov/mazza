// src/bot/bot.update.ts
import { Update, Ctx, Start, Command, On, Action, Message } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getMainMenuKeyboard, getLocationKeyboard, getStoreListKeyboard, getProductActionKeyboard, getRatingKeyboard, getLanguageKeyboard, getRoleKeyboard, getBusinessTypeKeyboard, getPaymentMethodKeyboard, getContactKeyboard, getProductListKeyboard, getNoStoresKeyboard, getSupportKeyboard } from 'src/common/utils/keyboard.util';
import { UsersService } from 'src/users/users.service';
import { SellersService } from 'src/sellers/sellers.service';
import { ProductsService } from 'src/products/products.service';
import { OrdersService } from 'src/orders/orders.service';
import { RatingsService } from 'src/ratings/ratings.service';
import { UserRole } from 'src/common/enums/user-role.enum';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';
import { getMessage } from 'src/config/messages';
import { envVariables } from 'src/config/env.variables';
import { SessionProvider } from './providers/session.provider';

@Update()
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly ratingsService: RatingsService,
    private readonly sessionProvider: SessionProvider,
  ) {}

  private initializeSession(ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    ctx.session = this.sessionProvider.getSession(telegramId);
  }

  @Command('debug')
  async debugCommand(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    // Check if this is an admin (you can modify this check)
    const adminTelegramIds = ['5543081353']; // Add your telegram ID here
    if (!adminTelegramIds.includes(ctx.from.id.toString())) {
      return;
    }
    
    try {
      const allUsers = await this.usersService.findAll();
      const allSellers = await this.sellersService.findAll();
      
      console.log('=== DEBUG INFO ===');
      console.log('Total users:', allUsers.length);
      console.log('Total sellers:', allSellers.length);
      console.log('Users:', allUsers);
      console.log('Sellers:', allSellers);
      
      // Test creating a simple user
      console.log('=== TESTING USER CREATION ===');
      const testUser = await this.usersService.create({
        telegramId: 'test_' + Date.now(),
        phoneNumber: '+998901234567',
        language: 'uz'
      });
      console.log('Test user created:', testUser);
      
      await ctx.reply(`🔍 Debug Info:\n\n👥 Users: ${allUsers.length}\n🏪 Sellers: ${allSellers.length}\n✅ Test user created\n\nCheck console for details.`);
    } catch (error) {
      console.error('Debug command error:', error);
      await ctx.reply(`❌ Debug command failed: ${error.message}\n\nCheck console for error.`);
    }
  }

  @Command('start')
  async startCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    console.log('Start command for telegramId:', telegramId);
    
    // Check if user already exists
    let user = await this.usersService.findByTelegramId(telegramId);
    let seller = await this.sellersService.findByTelegramId(telegramId);

    console.log('Found user:', user);
    console.log('Found seller:', seller);

    if (user || seller) {
      // User already registered, show main menu
      const language = user?.language || seller?.language || 'uz';
      ctx.session.language = language;
      ctx.session.role = user ? UserRole.USER : UserRole.SELLER;

      const role = user ? 'user' : 'seller';
      await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, role) });
    } else {
      // New user, show language selection
      await ctx.reply(getMessage('uz', 'selectLanguage'), { reply_markup: getLanguageKeyboard() });
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
    if (!ctx.message || !('text' in ctx.message)) return;
    
    this.initializeSession(ctx);
    const text = ctx.message.text;
    const language = ctx.session.language || 'uz';

    // Handle seller registration text inputs
    if (ctx.session.role === UserRole.SELLER && ctx.session.registrationStep) {
      const step = ctx.session.registrationStep;
      
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
        const price = parseFloat(text);
        if (isNaN(price) || price <= 0) {
          return ctx.reply(getMessage(language, 'validation.invalidPrice'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.price = price;
        ctx.session.registrationStep = 'product_original_price';
        await ctx.reply(getMessage(language, 'registration.priceSuccess'));
        return;
      } else if (step === 'product_original_price') {
        const originalPrice = parseFloat(text);
        if (isNaN(originalPrice) || originalPrice < 0) {
          return ctx.reply(getMessage(language, 'validation.invalidOriginalPrice'));
        }

        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.originalPrice = originalPrice > 0 ? originalPrice : undefined;
        ctx.session.registrationStep = 'product_description';
        await ctx.reply(getMessage(language, 'registration.originalPriceSuccess'));
        return;
      } else if (step === 'product_description') {
        if (!ctx.session.productData) {
          ctx.session.productData = {};
        }
        ctx.session.productData.description = text;
        ctx.session.registrationStep = 'product_available_until';
        await ctx.reply(getMessage(language, 'registration.descriptionSuccess'));
        return;
      } else if (step === 'product_available_until') {
        const timeText = text;
        const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})$/);
        
        if (!timeMatch) {
          return ctx.reply(getMessage(language, 'validation.invalidTime'));
        }

        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        
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
          await this.productsService.create(createProductDto);

          // Clear product data and registration step
          ctx.session.productData = {};
          ctx.session.registrationStep = undefined;

          await ctx.reply(getMessage(language, 'success.productCreated'));
        } catch (error) {
          console.error('Product creation error:', error);
          await ctx.reply(getMessage(language, 'error.productCreationFailed'));
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
    } else if (text.includes(getMessage(language, 'mainMenu.support'))) {
      await this.handleSupport(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.language'))) {
      await ctx.reply(getMessage(language, 'selectLanguage'), { reply_markup: getLanguageKeyboard() });
    } else {
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
      // User registration - complete after phone number
      ctx.session.userData = { phoneNumber: contact.phone_number };
      
      // Complete user registration immediately
      try {
        if (!ctx.from) throw new Error('User not found');
        if (!ctx.session.userData.phoneNumber) {
          throw new Error('Missing user data');
        }

        // Check if user already exists
        const existingUser = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (existingUser) {
          await ctx.reply(getMessage(language, 'error.userAlreadyExists'));
          return;
        }

        const createUserDto = {
          telegramId: ctx.from.id.toString(),
          phoneNumber: ctx.session.userData.phoneNumber,
          location: undefined, // Location will be set when finding stores
          paymentMethod: undefined, // Payment method will be set during purchase
          language: ctx.session.language
        };

                console.log('Creating user with DTO:', createUserDto);
        const createdUser = await this.usersService.create(createUserDto);
        console.log('User created successfully:', createdUser);
        
        await ctx.reply(getMessage(language, 'success.userRegistration'));
        await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'user') });
      } catch (error) {
        console.error('User registration error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          constraint: error.constraint,
          detail: error.detail
        });
        
        if (error.message === 'User already exists with this telegram ID') {
          await ctx.reply(getMessage(language, 'error.userAlreadyExists'));
        } else {
          await ctx.reply(`❌ Registration failed: ${error.message}`);
        }
      }
    } else if (ctx.session.role === UserRole.SELLER) {
      // Seller registration
      ctx.session.sellerData = { phoneNumber: contact.phone_number };
      ctx.session.registrationStep = 'business_name';
      await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
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
    
    // Handle registration location step
    if (ctx.session.registrationStep !== 'location') return;
    
    if (ctx.session.role === UserRole.USER) {
      // User registration - location step
      if (!ctx.session.userData) {
        ctx.session.userData = {};
      }
      ctx.session.userData.location = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      ctx.session.registrationStep = 'payment';
      await ctx.reply(getMessage(language, 'registration.locationSuccess'), { reply_markup: getPaymentMethodKeyboard(language) });
    } else if (ctx.session.role === UserRole.SELLER) {
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
        await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language, 'seller') });
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
    const storeId = parseInt(ctx.match[1]);
    await this.handleStoreDetails(ctx, storeId);
  }

  @Action(/buy_(\d+)/)
  async onBuyProduct(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    const productId = parseInt(ctx.match[1]);
    await this.handleBuyProduct(ctx, productId);
  }

  @Action(/rate_(\d+)/)
  async onRateProduct(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    const rating = parseInt(ctx.match[1]);
    await this.handleRateProduct(ctx, rating);
  }

  @Action(/page_(\d+)/)
  async onPageChange(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
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
    
    // Handle payment method selection during purchase
    if (ctx.session.action === 'selecting_payment') {
      ctx.session.selectedPaymentMethod = paymentMethod;
      ctx.session.action = undefined;
      
      // Complete the purchase
      await this.handleCompletePurchase(ctx);
      return;
    }
  }

  @Action('back_to_store')
  async onBackToStore(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    // Clear payment method selection
    ctx.session.selectedPaymentMethod = undefined;
    ctx.session.action = undefined;
    
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
    
    const stores = await this.sellersService.findNearbyStores(
      location.latitude,
      location.longitude
    );

    if (stores.length === 0) {
      return ctx.reply(getMessage(language, 'error.noStoresNearby'), { 
        reply_markup: getNoStoresKeyboard(language) 
      });
    }

    const currentPage = ctx.session.currentPage || 0;
    
    let storeList = '';
    const itemsPerPage = 10;
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStores = stores.slice(startIndex, endIndex);

    currentStores.forEach((store, index) => {
      const storeNumber = startIndex + index + 1;
      const distance = store.distance;
      const isOpen = store.isOpen;
      const status = isOpen ? getMessage(language, 'stores.openStatus') : getMessage(language, 'stores.closedStatus');
      
      storeList += getMessage(language, 'stores.storeItem', {
        number: storeNumber,
        businessName: store.businessName,
        businessType: store.businessType,
        distance: distance,
        status: status
      });
    });

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

    // Store information
    let storeInfo = getMessage(language, 'stores.storeDetailsHeader', {
      businessName: store.businessName,
      businessType: store.businessType,
      phoneNumber: store.phoneNumber,
      hours: hours,
      status: status
    });

    if (products.length > 0) {
      // Add products list with buy buttons
      let productsList = '';
      products.forEach((product, index) => {
        const availableUntil = new Date(product.availableUntil);
        const availableTime = `${availableUntil.getHours()}:${availableUntil.getMinutes().toString().padStart(2, '0')}`;
        
        productsList += getMessage(language, 'products.productItemWithBuy', {
          number: index + 1,
          id: product.id,
          price: product.price,
          description: product.description,
          availableUntil: availableTime
        });
      });

      ctx.session.selectedStoreId = storeId;
      await ctx.reply(storeInfo + '\n\n' + productsList, { 
        reply_markup: getProductListKeyboard(products, language) 
      });
    } else {
      await ctx.reply(storeInfo + '\n\n' + getMessage(language, 'stores.noProductsAvailable'));
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

    // Store selected product and show payment method selection
    ctx.session.selectedProductId = productId;
    ctx.session.action = 'selecting_payment';
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'purchase.selectPaymentMethod', {
      productName: product.description,
      price: product.price
    }), { reply_markup: getPaymentMethodKeyboard(language) });
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
        date: order.createdAt.toLocaleDateString()
      });
    });

    await ctx.reply(getMessage(language, 'orders.myOrders', { ordersList }));
  }

  private async handleAddProduct(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    console.log('Handling add product for telegramId:', telegramId);
    
    const seller = await this.sellersService.findByTelegramId(telegramId);
    console.log('Found seller:', seller);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }

    console.log('Seller status:', seller.status);
    if (seller.status !== SellerStatus.APPROVED) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotApproved'));
    }

    console.log('Starting product creation flow...');
    
    // Start product creation flow without scenes
    ctx.session.registrationStep = 'product_price';
    ctx.session.productData = {};
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'registration.priceRequest'));
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
        date: product.createdAt.toLocaleDateString()
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

  private isStoreOpen(opensAt: number, closesAt: number): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return currentTime >= opensAt && currentTime <= closesAt;
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

    const paymentMethod = ctx.session.selectedPaymentMethod;
    if (!paymentMethod) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.paymentMethodNotSelected'));
    }

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

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.orderCreated', {
        code: order.code,
        price: product.price
      }));
      
      // Send code to seller
      const seller = await this.sellersService.findOne(product.seller.id);
      if (seller) {
        const sellerTexts = {
          uz: `🆕 Yangi buyurtma!\n\n📋 Kod: ${order.code}\n💰 Narxi: ${product.price} so'm\n👤 Mijoz: ${user.phoneNumber}`,
          ru: `🆕 Новый заказ!\n\n📋 Код: ${order.code}\n💰 Цена: ${product.price} сум\n👤 Клиент: ${user.phoneNumber}`
        };
        
        // Here you would send message to seller via bot
        // ctx.telegram.sendMessage(seller.telegramId, sellerTexts[seller.language]);
      }

      // Clear session data
      ctx.session.selectedProductId = undefined;
      ctx.session.selectedPaymentMethod = undefined;
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.orderCreationFailed'));
    }
  }
}