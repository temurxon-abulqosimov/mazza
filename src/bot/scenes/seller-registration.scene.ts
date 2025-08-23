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
  ) {
    console.log('=== SELLER REGISTRATION SCENE CONSTRUCTOR ===');
    console.log('Scene instantiated with services');
  }

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
      console.log('=== CREATING SELLER ===');
      console.log('User found:', !!ctx.from);
      console.log('Seller data:', ctx.session.sellerData);
      
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.sellerData?.phoneNumber || !ctx.session.sellerData?.businessName || 
          !ctx.session.sellerData?.businessType || !ctx.session.sellerData?.location) {
        console.log('Missing data:', {
          phoneNumber: !!ctx.session.sellerData?.phoneNumber,
          businessName: !!ctx.session.sellerData?.businessName,
          businessType: !!ctx.session.sellerData?.businessType,
          location: !!ctx.session.sellerData?.location
        });
        throw new Error('Missing seller data');
      }

      const createSellerDto: CreateSellerDto = {
        telegramId: ctx.from.id.toString(),
        phoneNumber: ctx.session.sellerData.phoneNumber,
        businessName: ctx.session.sellerData.businessName,
        businessType: ctx.session.sellerData.businessType,
        location: ctx.session.sellerData.location,
        status: SellerStatus.PENDING,
        language: ctx.session.language || 'uz'
      };
      
      console.log('CreateSellerDto:', createSellerDto);

      const seller = await this.sellersService.create(createSellerDto);
      console.log('Seller created successfully:', seller.id);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      
      // Move to store image step
      ctx.session.registrationStep = 'store_image';
      
      // Clear location keyboard and show store image request
      await ctx.reply(getMessage(language, 'registration.storeImageRequest'), { 
        reply_markup: getSkipImageKeyboard(language) 
      });
      
      console.log('Moved to store_image step');
      
      // Don't leave the scene yet - wait for image or skip
    } catch (error) {
      console.error('Error creating seller:', error);
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
      
      // Show more specific error message
      if (error.message === 'Missing seller data') {
        await ctx.reply('❌ Registration failed: Missing required data. Please try again.');
      } else {
        await ctx.reply(`❌ Registration failed: ${error.message}`);
      }
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
    
    // Always start from phone step when entering the scene
    ctx.session.registrationStep = 'phone';
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    
    console.log('Starting with phone step');
    
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
    
    // Add a test message to verify the scene is working
    await ctx.reply('🔧 Scene entered successfully! You should see the phone request above.');
    
    console.log('Phone request sent successfully');
    console.log('Final session state:', ctx.session);
    console.log('Scene enter completed');
  }

  // Add a middleware to ensure all handlers work
  @On('message')
  async onAnyMessage(@Ctx() ctx: TelegramContext) {
    console.log('=== ANY MESSAGE RECEIVED IN SCENE ===');
    console.log('Message type:', ctx.message ? Object.keys(ctx.message)[0] : 'no message');
    console.log('Current step:', ctx.session.registrationStep);
    console.log('Scene active:', !!ctx.scene);
  }

  @On('contact')
  async onContact(@Ctx() ctx: TelegramContext) {
    console.log('=== SELLER REGISTRATION CONTACT HANDLER ===');
    console.log('Scene active:', !!ctx.scene);
    console.log('Scene name:', ctx.scene ? 'seller-registration' : 'none');
    console.log('Current step:', ctx.session.registrationStep);
    console.log('Expected step: phone');
    console.log('User role:', ctx.session.role);
    console.log('Contact message received:', !!ctx.message && 'contact' in ctx.message);
    
    // Ensure we're in the right scene
    if (!ctx.scene) {
      console.log('No scene context, returning');
      return;
    }
    
    if (ctx.session.registrationStep !== 'phone') {
      console.log('Step mismatch, returning');
      return;
    }
    
    if (!ctx.message || !('contact' in ctx.message)) {
      console.log('No valid contact message, returning');
      return;
    }

    const contact = ctx.message.contact;
    console.log('Contact object:', contact);
    
    if (!contact.phone_number) {
      const language = ctx.session.language || 'uz';
      console.log('No phone number in contact, showing error');
      return ctx.reply(getMessage(language, 'registration.phoneError'));
    }

    console.log('Phone number received:', contact.phone_number);
    ctx.session.sellerData = { phoneNumber: contact.phone_number };
    ctx.session.registrationStep = 'business_name';
    console.log('Updated step to business_name');
    console.log('Updated seller data:', ctx.session.sellerData);

    const language = ctx.session.language || 'uz';
    
    // Clear keyboard and ask for business name
    await ctx.reply(getMessage(language, 'registration.businessNameRequest'), {
      reply_markup: { remove_keyboard: true }
    });
    
    console.log('Business name request sent successfully');
  }

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
      
      // Check if this is a back button
      if (ctx.message.text === getMessage(language, 'actions.back')) {
        console.log('Back button pressed, returning to phone step');
        ctx.session.registrationStep = 'phone';
        await ctx.reply(getMessage(language, 'registration.phoneRequest'), { 
          reply_markup: { 
            keyboard: [
              [{ text: getMessage(language, 'actions.shareContact'), request_contact: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
        return;
      }
      
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

  @Action('back_to_business_name')
  async onBackToBusinessName(@Ctx() ctx: TelegramContext) {
    console.log('Back to business name action received');
    
    if (ctx.session.registrationStep !== 'business_type') {
      console.log('Step mismatch, returning');
      return;
    }
    
    ctx.session.registrationStep = 'business_name';
    const language = ctx.session.language || 'uz';
    
    await ctx.reply(getMessage(language, 'registration.businessNameRequest'), {
      reply_markup: { remove_keyboard: true }
    });
    
    console.log('Returned to business name step');
  }

  @On('location')
  async onLocation(@Ctx() ctx: TelegramContext) {
    console.log('=== LOCATION RECEIVED ===');
    console.log('Current step:', ctx.session.registrationStep);
    console.log('Expected step: location');
    console.log('Message type:', ctx.message ? typeof ctx.message : 'no message');
    console.log('Has location:', ctx.message && 'location' in ctx.message);
    
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
    console.log('Latitude:', location.latitude, 'Longitude:', location.longitude);
    
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    
    ctx.session.sellerData.location = {
      latitude: location.latitude,
      longitude: location.longitude
    };
    
    console.log('Updated seller data with location:', ctx.session.sellerData.location);
    console.log('Full seller data:', ctx.session.sellerData);

    // Now create the seller with all required data
    console.log('Calling createSeller...');
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