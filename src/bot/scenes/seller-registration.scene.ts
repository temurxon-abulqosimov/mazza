// src/bot/scenes/seller-registration.scene.ts
import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getLocationKeyboard, getBusinessTypeKeyboard, getSkipImageKeyboard, getMainMenuKeyboard } from 'src/common/utils/keyboard.util';
import { SellersService } from 'src/sellers/sellers.service';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';

@Scene('seller-registration')
export class SellerRegistrationScene {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sessionProvider: SessionProvider,
  ) {}

  private initializeSession(ctx: TelegramContext) {
    if (!ctx.session) {
      ctx.session = {
        language: 'uz'
      };
    }
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
  }

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    
    const language = ctx.session.language || 'uz';
    
    // Always start from phone step when entering the scene
    ctx.session.registrationStep = 'phone';
    
    // Show phone request
    await ctx.reply(getMessage(language, 'registration.phoneRequest'), { 
      reply_markup: { 
        keyboard: [
          [{ text: getMessage(language, 'actions.shareContact'), request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  }

  @On('contact')
  async onContact(@Ctx() ctx: TelegramContext) {
    if (!ctx.message || !('contact' in ctx.message)) return;
    
    this.initializeSession(ctx);
    
    const contact = ctx.message.contact;
    if (!contact.phone_number) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'registration.phoneError'));
    }

    // Store phone number and move to business name step
    if (ctx.session.sellerData) {
      ctx.session.sellerData.phoneNumber = contact.phone_number;
    }
    ctx.session.registrationStep = 'business_name';
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    if (!ctx.message || !('text' in ctx.message)) return;
    
    const text = ctx.message.text;
    const language = ctx.session.language || 'uz';
    
    if (ctx.session.registrationStep === 'business_name') {
      // Store business name and show business type selection
      if (ctx.session.sellerData) {
        ctx.session.sellerData.businessName = text;
      }
      ctx.session.registrationStep = 'business_type';
      
      await ctx.reply(getMessage(language, 'registration.businessTypeRequest'), {
        reply_markup: getBusinessTypeKeyboard(language)
      });
    }
  }

  @Action(/business_type_(.+)/)
  async onBusinessType(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    const businessType = ctx.match[1] as BusinessType;
    const language = ctx.session.language || 'uz';
    
    if (ctx.session.sellerData) {
      ctx.session.sellerData.businessType = businessType;
    }
    ctx.session.registrationStep = 'location';
    
    // Show location request
    await ctx.reply(getMessage(language, 'registration.locationRequest'), {
      reply_markup: getLocationKeyboard(language)
    });
  }

  @On('location')
  async onLocation(@Ctx() ctx: TelegramContext) {
    if (!ctx.message || !('location' in ctx.message)) return;
    
    const location = ctx.message.location;
    const language = ctx.session.language || 'uz';
    
    if (ctx.session.registrationStep === 'location' && ctx.session.sellerData) {
      ctx.session.sellerData.location = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      // Move to store image step
      ctx.session.registrationStep = 'store_image';
      await ctx.reply(getMessage(language, 'registration.storeImageRequest'), {
        reply_markup: getSkipImageKeyboard(language)
      });
    }
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: TelegramContext) {
    if (!ctx.message || !('photo' in ctx.message)) return;
    
    const photos = ctx.message.photo;
    if (photos && photos.length > 0) {
      const photo = photos[photos.length - 1];
      const language = ctx.session.language || 'uz';
      
      if (ctx.session.registrationStep === 'store_image' && ctx.session.sellerData) {
        ctx.session.sellerData.imageUrl = photo.file_id;
        
        // Create seller with image
        await this.createSeller(ctx);
      }
    }
  }

  @Action('skip_image')
  async onSkipImage(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'store_image') return;
    
    const language = ctx.session.language || 'uz';
    
    // Create seller without image
    await this.createSeller(ctx);
  }

  private async createSeller(ctx: TelegramContext) {
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

      await this.sellersService.create(createSellerDto);
      
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      
      // Clear registration data and show main menu
      ctx.session.registrationStep = undefined;
      ctx.session.sellerData = undefined;
      
      await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
        reply_markup: getMainMenuKeyboard(language, 'seller') 
      });
      
      // Leave the scene
      if (ctx.scene) {
        await ctx.scene.leave();
      }
    } catch (error) {
      console.error('Seller creation error:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }
} 