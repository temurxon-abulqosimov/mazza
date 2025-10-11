// src/bot/scenes/photo-change.scene.ts
import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getMainMenuKeyboard, getSkipImageKeyboard } from 'src/common/utils/keyboard.util';
import { SellersService } from 'src/sellers/sellers.service';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';

@Scene('photo-change')
export class PhotoChangeScene {
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
    
    // Set photo change step
    ctx.session.photoChangeStep = 'waiting_photo';
    
    await ctx.reply(getMessage(language, 'registration.changePhotoRequest'), { 
      reply_markup: getSkipImageKeyboard(language) 
    });
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: TelegramContext) {
    if (ctx.session.photoChangeStep !== 'waiting_photo') return;
    if (!ctx.message || !('photo' in ctx.message)) return;

    const language = ctx.session.language || 'uz';
    const photos = ctx.message.photo;
    
    if (photos && photos.length > 0) {
      // Get the largest photo (best quality)
      const photo = photos[photos.length - 1];
      
      try {
        if (!ctx.from) throw new Error('User not found');
        
        // Find the seller and update their photo
        const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
        if (seller) {
          // Store the file_id directly
          await this.sellersService.update(seller.id, { 
            imageUrl: photo.file_id
          });
          
          console.log('Store photo updated successfully, file_id:', photo.file_id);
          await ctx.reply(getMessage(language, 'registration.photoChangedSuccess') + '\n' + (language === 'uz' 
            ? 'Bu rasm sizning do\'kon fotosi sifatida saqlanadi va mahsulotlaringiz ro\'yxatlarida ko\'rinadi.'
            : 'Это фото сохранится как фото магазина и будет показываться в карточках ваших товаров.'));
        } else {
          throw new Error('Seller not found');
        }
        
        // Return to main menu
        await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
          reply_markup: getMainMenuKeyboard(language, 'seller') 
        });
        
        // Leave the scene
        if (ctx.scene) {
          await ctx.scene.leave();
        }
      } catch (error) {
        console.error('Photo update error:', error);
        await ctx.reply(getMessage(language, 'error.photoProcessingFailed'));
        
        // Return to main menu on error
        await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
          reply_markup: getMainMenuKeyboard(language, 'seller') 
        });
        
        if (ctx.scene) {
          await ctx.scene.leave();
        }
      }
    }
  }

  @Action('skip_image')
  async onSkipImage(@Ctx() ctx: TelegramContext) {
    if (ctx.session.photoChangeStep !== 'waiting_photo') return;
    
    const language = ctx.session.language || 'uz';
    
    // Skip photo change and return to main menu
    await ctx.reply(getMessage(language, 'mainMenu.welcome'), { 
      reply_markup: getMainMenuKeyboard(language, 'seller') 
    });
    
    // Leave the scene
    if (ctx.scene) {
      await ctx.scene.leave();
    }
  }
} 