import { Scene, SceneEnter, SceneLeave } from 'nestjs-telegraf';

@Scene('LANGUAGE_SCENE')
export class LanguageScene {
  @SceneEnter()
  async enter(ctx) {
    // Nothing needed; keyboard already shown in /start
  }

  async onMessage(ctx) {
    const text = ctx.message.text;
    if (text.includes('Oʻzbekcha')) {
      ctx.session.language = 'uz';
    } else if (text.includes('Русский')) {
      ctx.session.language = 'ru';
    } else {
      return ctx.reply('Iltimos, tilni tanlang / Пожалуйста, выберите язык');
    }

    await ctx.reply(
      ctx.session.language === 'uz'
        ? 'Iltimos, rolingizni tanlang'
        : 'Пожалуйста, выберите свою роль',
      {
        reply_markup: {
          keyboard: [['🧑‍💼 Sotuvchi / Продавец', '🙋‍♂️ Foydalanuvchi / Пользователь']],
          resize_keyboard: true,
        },
      }
    );

    return ctx.scene.enter('ROLE_SCENE');
  }
}
