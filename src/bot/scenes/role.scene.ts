import { Ctx, Scene, SceneEnter, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getRoleKeyboard } from 'src/common/utils/keyboard.util';
import { UserRole } from 'src/common/enums/user-role.enum';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';

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
    
    const role = ctx.match[1] as UserRole;
    
    // Set the role in the session
    ctx.session.role = role;
    
    // Update the session provider
    if (ctx.from) {
      this.sessionProvider.setSession(ctx.from.id.toString(), ctx.session);
    }
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, `roleSelected.${role}`));
    
    if (role === UserRole.USER) {
      if (ctx.scene) {
        try {
          // Leave current scene first
          await ctx.scene.leave();
          
          // Enter user registration scene
          await ctx.scene.enter('user-registration');
        } catch (error) {
          console.error('Error entering user-registration scene:', error);
        }
      }
    } else {
      if (ctx.scene) {
        try {
          // Leave current scene first
          await ctx.scene.leave();
          
          // Enter seller registration scene
          await ctx.scene.enter('seller-registration');
        } catch (error) {
          console.error('Error entering seller-registration scene:', error);
        }
      }
    }
  }
}
