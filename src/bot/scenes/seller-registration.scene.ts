// src/bot/scenes/seller-registration.scene.ts
import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getLocationKeyboard, getBusinessTypeKeyboard, getSkipImageKeyboard, getMainMenuKeyboard } from 'src/common/utils/keyboard.util';
import { SellersService } from 'src/sellers/sellers.service';
import { CreateSellerDto } from 'src/sellers/dto/create-seller.dto';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';


@Scene('seller-registration')
export class SellerRegistrationScene {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sessionProvider: SessionProvider,
  ) {}

  private initializeSession(ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    ctx.session = this.sessionProvider.getSession(telegramId);
  }

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    
    // Reset registration data when entering scene
    ctx.session.registrationStep = 'phone';
    ctx.session.sellerData = {};
    
    // Clear any existing keyboards and show phone request
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
    if (ctx.session.registrationStep !== 'phone') return;
    if (!ctx.message || !('contact' in ctx.message)) return;

    const contact = ctx.message.contact;
    if (!contact.phone_number) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'registration.phoneError'));
    }

    ctx.session.sellerData = { phoneNumber: contact.phone_number };
    ctx.session.registrationStep = 'business_name';

    const language = ctx.session.language || 'uz';
    
    // Clear keyboard and ask for business name
    await ctx.reply(getMessage(language, 'registration.businessNameRequest'), {
      reply_markup: { remove_keyboard: true }
    });
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    const step = ctx.session.registrationStep;
    const language = ctx.session.language || 'uz';
    if (!ctx.message || !('text' in ctx.message)) return;

    console.log('Text received, current step:', step, 'text:', ctx.message.text);

    if (step === 'business_name') {
      if (!ctx.session.sellerData) {
        ctx.session.sellerData = {};
      }
      ctx.session.sellerData.businessName = ctx.message.text;
      ctx.session.registrationStep = 'business_type';

      await ctx.reply(getMessage(language, 'registration.businessNameSuccess'), { 
        reply_markup: getBusinessTypeKeyboard(language) 
      });
    } else if (step === 'location') {
      // Handle back button in location step
      if (ctx.message.text === getMessage(language, 'actions.back')) {
        console.log('Back button pressed, returning to business type selection');
        ctx.session.registrationStep = 'business_type';
        await ctx.reply(getMessage(language, 'registration.businessTypeRequest'), { 
          reply_markup: getBusinessTypeKeyboard(language) 
        });
        return;
      }
      
      // If not back button, show invalid format message
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    } else {
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }

  @Action(/business_(cafe|restaurant|market|bakery|other)/)
  async onBusinessType(@Ctx() ctx: TelegramContext) {
    console.log('Business type action received:', ctx.match);
    
    if (ctx.session.registrationStep !== 'business_type') {
      console.log('Business type step mismatch, expected: business_type, got:', ctx.session.registrationStep);
      return;
    }
    
    if (!ctx.match) {
      console.log('No business type match found');
      return;
    }

    const businessType = ctx.match[1] as BusinessType;
    console.log('Selected business type:', businessType);
    
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    ctx.session.sellerData.businessType = businessType;
    ctx.session.registrationStep = 'location';

    const language = ctx.session.language || 'uz';
    
    try {
      // Clear previous inline keyboard and show location request with proper keyboard
      const locationKeyboard = getLocationKeyboard(language);
      console.log('Location keyboard:', JSON.stringify(locationKeyboard));
      console.log('Current registration step:', ctx.session.registrationStep);
      console.log('Seller data:', ctx.session.sellerData);
      
      // Validate keyboard structure
      if (!locationKeyboard.keyboard || !Array.isArray(locationKeyboard.keyboard)) {
        throw new Error('Invalid location keyboard structure');
      }
      
      await ctx.reply(getMessage(language, 'registration.locationRequest'), { 
        reply_markup: locationKeyboard 
      });
      
      console.log('Location request sent successfully');
    } catch (error) {
      console.error('Error showing location keyboard:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  @On('location')
  async onLocation(@Ctx() ctx: TelegramContext) {
    console.log('Location received, current step:', ctx.session.registrationStep);
    
    if (ctx.session.registrationStep !== 'location') {
      console.log('Location step mismatch, expected: location, got:', ctx.session.registrationStep);
      return;
    }
    
    if (!ctx.message || !('location' in ctx.message)) {
      console.log('Invalid location message');
      return;
    }

    const location = ctx.message.location;
    console.log('Location data received:', location);
    
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    ctx.session.sellerData.location = {
      latitude: location.latitude,
      longitude: location.longitude
    };

    // Create seller
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.sellerData.phoneNumber || !ctx.session.sellerData.businessName || 
          !ctx.session.sellerData.businessType || !ctx.session.sellerData.location) {
        throw new Error('Missing seller data');
      }

      const createSellerDto: CreateSellerDto = {
        telegramId: ctx.from.id.toString(),
        phoneNumber: ctx.session.sellerData.phoneNumber,
        businessName: ctx.session.sellerData.businessName,
        businessType: ctx.session.sellerData.businessType,
        location: ctx.session.sellerData.location,
        status: SellerStatus.PENDING,
        language: ctx.session.language
      };

      await this.sellersService.create(createSellerDto);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      
      // Move to store image step
      ctx.session.registrationStep = 'store_image';
      
      // Clear location keyboard and show store image request
      await ctx.reply(getMessage(language, 'registration.storeImageRequest'), { 
        reply_markup: getSkipImageKeyboard(language) 
      });
      
      // Don't leave the scene yet - wait for image or skip
    } catch (error) {
      console.error('Error creating seller:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'store_image') return;
    if (!ctx.message || !('photo' in ctx.message)) return;

    const language = ctx.session.language || 'uz';
    const photos = ctx.message.photo;
    
    if (photos && photos.length > 0) {
      // Get the largest photo (best quality)
      const photo = photos[photos.length - 1];
      
      try {
        // Store the file_id directly - this is the most reliable way
        if (!ctx.from) throw new Error('User not found');
        
        const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
        if (seller) {
          // Store the file_id directly
          await this.sellersService.update(seller.id, { 
            imageUrl: photo.file_id
          });
          
          console.log('Store image uploaded successfully, file_id:', photo.file_id);
          await ctx.reply(getMessage(language, 'success.storeImageUploaded'));
        }
        
        // Complete registration and go to main menu
        await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
          reply_markup: getMainMenuKeyboard(language, 'seller') 
        });
        
        // Leave the scene
        if (ctx.scene) {
          await ctx.scene.leave();
        }
      } catch (error) {
        console.error('Store image processing error:', error);
        await ctx.reply(getMessage(language, 'error.photoProcessingFailed'));
      }
    }
  }

  @Action('skip_image')
  async onSkipImage(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'store_image') return;
    
    const language = ctx.session.language || 'uz';
    
    // Skip image upload and go to main menu
    await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
      reply_markup: getMainMenuKeyboard(language, 'seller') 
    });
    
    // Leave the scene
    if (ctx.scene) {
      await ctx.scene.leave();
    }
  }
}