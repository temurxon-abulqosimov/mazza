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
    
    // Only initialize if session doesn't exist
    if (!ctx.session) {
      ctx.session = this.sessionProvider.getSession(telegramId);
      console.log('Session initialized from provider');
    } else {
      console.log('Session already exists, not overriding');
    }
  }

  private async createSeller(ctx: TelegramContext) {
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.sellerData?.phoneNumber || !ctx.session.sellerData?.businessName || 
          !ctx.session.sellerData?.businessType || !ctx.session.sellerData?.location) {
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

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    console.log('=== SELLER REGISTRATION SCENE ENTER ===');
    console.log('Scene context:', !!ctx.scene);
    console.log('User ID:', ctx.from?.id);
    console.log('Session before init:', ctx.session);
    
    this.initializeSession(ctx);
    
    console.log('Session after init:', ctx.session);
    console.log('Current registration step:', ctx.session.registrationStep);
    
    const language = ctx.session.language || 'uz';
    
    // The scene should start from business_name step since phone is handled by main bot
    if (!ctx.session.registrationStep || ctx.session.registrationStep === 'phone') {
      // If we're at phone step, move to business_name
      ctx.session.registrationStep = 'business_name';
      console.log('Moving to business_name step');
    }
    
    if (ctx.session.registrationStep === 'business_name') {
      // Start with business name step
      console.log('Starting with business name step');
      await ctx.reply(getMessage(language, 'registration.businessNameRequest'), {
        reply_markup: { remove_keyboard: true }
      });
    } else if (ctx.session.registrationStep === 'business_type') {
      // Continue from business type step
      console.log('Continuing from business type step');
      await ctx.reply(getMessage(language, 'registration.businessTypeRequest'), { 
        reply_markup: getBusinessTypeKeyboard(language) 
      });
    }
    
    console.log('Final session state:', ctx.session);
    console.log('Scene enter completed');
  }

  // Phone input is handled by main bot, scene starts from business_name
  // @On('contact') - removed since phone is handled by main bot

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    console.log('=== SELLER REGISTRATION TEXT HANDLER DEBUG ===');
    console.log('Scene active:', !!ctx.scene);
    console.log('Current registration step:', ctx.session.registrationStep);
    console.log('Message text:', ctx.message && 'text' in ctx.message ? ctx.message.text : 'no text');
    console.log('Message type:', ctx.message ? typeof ctx.message : 'no message');
    console.log('Session data:', {
      role: ctx.session.role,
      language: ctx.session.language,
      sellerData: ctx.session.sellerData
    });
    
    // Ensure we're in the right scene
    if (!ctx.scene) {
      console.log('No scene context, returning');
      return;
    }
    
    const step = ctx.session.registrationStep;
    const language = ctx.session.language || 'uz';
    if (!ctx.message || !('text' in ctx.message)) {
      console.log('No valid text message found');
      return;
    }

    console.log('Text received, current step:', step, 'text:', ctx.message.text);

    if (step === 'business_name') {
      console.log('Processing business_name step...');
      if (!ctx.session.sellerData) {
        ctx.session.sellerData = {};
      }
      ctx.session.sellerData.businessName = ctx.message.text;
      ctx.session.registrationStep = 'business_type';
      console.log('Updated registration step to business_type');
      console.log('Seller data:', ctx.session.sellerData);

      await ctx.reply(getMessage(language, 'registration.businessNameSuccess'), { 
        reply_markup: getBusinessTypeKeyboard(language) 
      });
      console.log('Business name success message sent with keyboard');
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
      console.log('Step not recognized:', step);
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
      
      // Ensure the first button has request_location: true
      if (!locationKeyboard.keyboard[0] || !locationKeyboard.keyboard[0][0] || !('request_location' in locationKeyboard.keyboard[0][0])) {
        throw new Error('Location keyboard first button must have request_location: true');
      }
      
      // Send the location request with the keyboard
      const sentMessage = await ctx.reply(getMessage(language, 'registration.locationRequest'), { 
        reply_markup: locationKeyboard 
      });
      
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

    // Now create the seller with all required data
    await this.createSeller(ctx);
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