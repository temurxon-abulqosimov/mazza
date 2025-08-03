// src/bot/bot.update.ts
import { Update, Ctx, Start, Command, On, Action, Message } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getMainMenuKeyboard, getLocationKeyboard, getStoreListKeyboard, getProductActionKeyboard, getRatingKeyboard, getLanguageKeyboard, getRoleKeyboard, getBusinessTypeKeyboard, getPaymentMethodKeyboard, getContactKeyboard } from 'src/common/utils/keyboard.util';
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

  @Command('start')
  async startCommand(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    
    // Check if user already exists
    let user = await this.usersService.findByTelegramId(telegramId);
    let seller = await this.sellersService.findByTelegramId(telegramId);

    if (user || seller) {
      // User already registered, show main menu
      const language = user?.language || seller?.language || 'uz';
      ctx.session.language = language;
      ctx.session.role = user ? UserRole.USER : UserRole.SELLER;

      await ctx.reply(getMessage(language, 'mainMenu.welcome'), { reply_markup: getMainMenuKeyboard(language) });
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

    // Handle main menu text commands
    if (text.includes(getMessage(language, 'mainMenu.findStores'))) {
      await this.handleFindStores(ctx);
    } else if (text.includes(getMessage(language, 'mainMenu.myOrders'))) {
      await this.handleMyOrders(ctx);
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
      // User registration
      ctx.session.userData = { phoneNumber: contact.phone_number };
      ctx.session.registrationStep = 'location';
      await ctx.reply(getMessage(language, 'registration.phoneSuccess'), { reply_markup: getLocationKeyboard(language) });
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
    if (ctx.session.registrationStep !== 'location') return;

    const location = ctx.message.location;
    console.log('Received location:', location);
    
    const language = ctx.session.language || 'uz';
    
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

        const createSellerDto = {
          telegramId: ctx.from.id.toString(),
          phoneNumber: ctx.session.sellerData.phoneNumber,
          businessName: ctx.session.sellerData.businessName,
          businessType: ctx.session.sellerData.businessType,
          location: ctx.session.sellerData.location,
          opensAt: ctx.session.sellerData.opensAt,
          closesAt: ctx.session.sellerData.closesAt,
          language: ctx.session.language,
          status: SellerStatus.PENDING
        };

        await this.sellersService.create(createSellerDto);
        await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      } catch (error) {
        await ctx.reply(getMessage(language, 'error.general'));
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

  @Action(/lang_(uz|ru)/)
  async onLanguageSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    this.initializeSession(ctx);
    const language = ctx.match[1] as 'uz' | 'ru';
    ctx.session.language = language;

    await ctx.reply(getMessage(language, 'languageSelected'));
    await ctx.reply(getMessage(language, 'selectRole'), { reply_markup: getRoleKeyboard(language) });
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
    if (ctx.session.registrationStep !== 'payment') return;

    const paymentMethod = ctx.match[1];
    const language = ctx.session.language || 'uz';
    
    if (ctx.session.role === UserRole.USER) {
      if (!ctx.session.userData) {
        ctx.session.userData = {};
      }
      ctx.session.userData.paymentMethod = paymentMethod as any;

      // Complete user registration
      try {
        if (!ctx.from) throw new Error('User not found');
        if (!ctx.session.userData.phoneNumber || !ctx.session.userData.location || !ctx.session.userData.paymentMethod) {
          throw new Error('Missing user data');
        }

        const createUserDto = {
          telegramId: ctx.from.id.toString(),
          phoneNumber: ctx.session.userData.phoneNumber,
          location: ctx.session.userData.location,
          paymentMethod: ctx.session.userData.paymentMethod,
          language: ctx.session.language
        };

        await this.usersService.create(createUserDto);
        
        // Debug: Check if user was created with location
        const createdUser = await this.usersService.findByTelegramId(ctx.from.id.toString());
        console.log('Created user:', createdUser);
        console.log('User location:', createdUser?.location);

        const language = ctx.session.language || 'uz';
        await ctx.reply(getMessage(language, 'success.userRegistration'));
      } catch (error) {
        await ctx.reply(getMessage(language, 'error.general'));
      }
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

  private async handleFindStores(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const user = await this.usersService.findByTelegramId(telegramId);
    
    if (!user) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.userNotFound'));
    }

    if (!user.location) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.locationNotFound'));
    }

    const stores = await this.sellersService.findNearbyStores(
      user.location.latitude,
      user.location.longitude
    );

    if (stores.length === 0) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.noStoresNearby'));
    }

    const currentPage = ctx.session.currentPage || 0;
    const language = ctx.session.language || 'uz';
    
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

    if (products.length > 0) {
      let productsList = '';
      products.forEach((product, index) => {
        const discount = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
        
        if (discount > 0) {
          productsList += getMessage(language, 'products.productWithDiscount', {
            number: index + 1,
            price: product.price,
            discount: discount
          });
        } else {
          productsList += getMessage(language, 'products.productWithoutDiscount', {
            number: index + 1,
            price: product.price
          });
        }
      });

      ctx.session.selectedStoreId = storeId;
      await ctx.reply(getMessage(language, 'stores.storeDetails', {
        businessName: store.businessName,
        businessType: store.businessType,
        phoneNumber: store.phoneNumber,
        hours: hours,
        productsList: productsList
      }), { reply_markup: getProductActionKeyboard(products[0].id, language) });
    } else {
      await ctx.reply(getMessage(language, 'stores.storeDetails', {
        businessName: store.businessName,
        businessType: store.businessType,
        phoneNumber: store.phoneNumber,
        hours: hours,
        productsList: getMessage(language, 'stores.noProductsAvailable')
      }));
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

    try {
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
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.orderCreationFailed'));
    }
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
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }

    if (seller.status !== 'approved') {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotApproved'));
    }

    if (ctx.scene) {
      await ctx.scene.enter('product-creation');
    }
  }

  private async handleMyProducts(@Ctx() ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    const seller = await this.sellersService.findByTelegramId(telegramId);
    
    if (!seller) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'error.sellerNotFound'));
    }

    const products = await this.productsService.findBySeller(seller.id);
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
    await ctx.reply(getMessage(language, 'support.support', { username: envVariables.SUPPORT_USERNAME }));
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
}