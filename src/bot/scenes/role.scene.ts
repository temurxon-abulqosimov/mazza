import { Scene, SceneEnter } from 'nestjs-telegraf';

@Scene('ROLE_SCENE')
export class RoleScene {
  @SceneEnter()
  async enter(ctx) {
    // Nothing needed; keyboard already shown in previous scene
  }

  async onMessage(ctx) {
    const text = ctx.message.text;
    const lang = ctx.session.language;

    if (text.includes('Sotuvchi') || text.includes('Продавец')) {
      ctx.session.role = 'seller';
      return ctx.scene.enter('SELLER_REGISTRATION_SCENE');
    }

    if (text.includes('Foydalanuvchi') || text.includes('Пользователь')) {
      ctx.session.role = 'user';
      return ctx.scene.enter('USER_REGISTRATION_SCENE');
    }

    return ctx.reply(
      lang === 'uz' ? 'Iltimos, rolingizni tanlang' : 'Пожалуйста, выберите роль'
    );
  }
}
