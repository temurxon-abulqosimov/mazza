// src/bot/scenes/user-registration.scene.ts
import { Ctx, Scene, SceneEnter, On, Action, Message } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getPaymentMethodKeyboard } from 'src/common/utils/keyboard.util';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';

@Scene('user-registration')
export class UserRegistrationScene {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionProvider: SessionProvider,
  ) {}

  private initializeSession(ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    
    if (!ctx.session) {
      ctx.session = this.sessionProvider.getSession(telegramId);
    }
  }

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
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
  }

  @On('contact')
  async onContact(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'phone') return;
    if (!ctx.message || !('contact' in ctx.message)) return;

    const contact = ctx.message.contact;
    if (!contact.phone_number) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'registration.phoneError'));
    }

    ctx.session.userData = { phoneNumber: contact.phone_number };
    ctx.session.registrationStep = 'payment';

    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'registration.phoneSuccess'), { reply_markup: getPaymentMethodKeyboard(language) });
  }

  @Action(/payment_(cash|card|click|payme)/)
  async onPaymentMethod(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'payment') return;
    if (!ctx.match) return;

    const paymentMethod = ctx.match[1] as PaymentMethod;
    if (!ctx.session.userData) {
      ctx.session.userData = {};
    }
    ctx.session.userData.paymentMethod = paymentMethod;

    // Create user
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.userData.phoneNumber || !ctx.session.userData.paymentMethod) {
        throw new Error('Missing user data');
      }

      const createUserDto: CreateUserDto = {
        telegramId: ctx.from.id.toString(),
        phoneNumber: ctx.session.userData.phoneNumber,
        paymentMethod: ctx.session.userData.paymentMethod,
        language: ctx.session.language
      };

      await this.usersService.create(createUserDto);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.userRegistration'));
      if (ctx.scene) {
        await ctx.scene.leave();
      }
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'validation.invalidFormat'));
  }
}