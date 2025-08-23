import { Ctx, Scene, SceneEnter, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getRoleKeyboard } from 'src/common/utils/keyboard.util';
import { UserRole } from 'src/common/enums/user-role.enum';
import { getMessage } from 'src/config/messages';

@Scene('role')
export class RoleScene {
  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    const language = ctx.session.language || 'uz';
    await ctx.reply('', { reply_markup: getRoleKeyboard(language) });
  }

  @Action(/role_(user|seller)/)
  async onRoleSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    const role = ctx.match[1] as UserRole;
    console.log('=== ROLE SELECTION ===');
    console.log('Role selected:', role);
    console.log('Session before role set:', ctx.session);
    
    // Set the role in the session
    ctx.session.role = role;
    console.log('Session after role set:', ctx.session);
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, `roleSelected.${role}`));
    
    if (role === UserRole.USER) {
      console.log('Entering user-registration scene');
      if (ctx.scene) {
        await ctx.scene.enter('user-registration');
      }
    } else {
      console.log('Entering seller-registration scene');
      if (ctx.scene) {
        await ctx.scene.enter('seller-registration');
      }
    }
  }
}
