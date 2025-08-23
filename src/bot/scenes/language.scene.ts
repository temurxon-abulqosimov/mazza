import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { getLanguageKeyboard } from 'src/common/utils/keyboard.util';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getMessage } from 'src/config/messages';

@Scene('language')
export class LanguageScene {
  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    await ctx.reply(getMessage('uz', 'selectLanguage'), { reply_markup: getLanguageKeyboard() });
  }

  @Action(/lang_(uz|ru)/)
  async onLanguageSelect(@Ctx() ctx: TelegramContext) {
    if (!ctx.match) return;
    
    const language = ctx.match[1] as 'uz' | 'ru';
    ctx.session.language = language;

    await ctx.reply(getMessage(language, 'success.languageChanged'));
    if (ctx.scene) {
      await ctx.scene.leave();
    }
  }
}
