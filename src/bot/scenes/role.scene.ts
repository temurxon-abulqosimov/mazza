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
    ctx.session.role = role;

    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, `roleSelected.${role}`));
    
    if (role === UserRole.USER) {
      if (ctx.scene) {
        await ctx.scene.enter('user-registration');
      }
    } else {
      if (ctx.scene) {
        await ctx.scene.enter('seller-registration');
      }
    }
  }
}
