import { Ctx, Scene, SceneEnter, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getRoleKeyboard } from 'src/common/utils/keyboard.util';
import { UserRole } from 'src/common/enums/user-role.enum';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';
import { getContactKeyboard } from 'src/common/utils/keyboard.util';

@Scene('role')
export class RoleScene {
  constructor(
    private readonly sessionProvider: SessionProvider,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    const language = ctx.session.language || 'uz';
    await ctx.reply('', { reply_markup: getRoleKeyboard(language) });
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

  private async handleDirectRegistration(ctx: TelegramContext, roleString: string, language: string) {
    console.log('Using direct registration fallback');
    ctx.session.registrationStep = 'phone';
    await ctx.reply(getMessage(language, 'registration.phoneRequest'), { 
      reply_markup: getContactKeyboard(language) 
    });
  }
}
