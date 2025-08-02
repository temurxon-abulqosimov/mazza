// src/bot/scenes/user-registration.scene.ts
import { Injectable } from '@nestjs/common';
import { Scenes, Composer } from 'telegraf';
import { BotContext, MyWizardSession } from '../bot.context';
import { UsersService } from 'src/users/users.service';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { i18n } from '../i18n';

@Injectable()
export class UserRegistrationWizard extends Scenes.WizardScene<BotContext> {
  constructor(private readonly usersService: UsersService) {
    super(
      'USER_REGISTRATION_SCENE',
      async (ctx: BotContext) => {
        console.log('Step 1: Asking for full name');
        await ctx.reply(i18n(ctx, 'user_full_name'));
        return ctx.wizard.next();
      },
      new Composer<BotContext>().on('text', async (ctx) => {
        const session = ctx.session as MyWizardSession;
        session.fullName = ctx.message.text;
        console.log('Step 2: Received full name:', session.fullName);
        await ctx.reply(i18n(ctx, 'user_phone'));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        const session = ctx.session as MyWizardSession;
        session.phone = ctx.message.text;
        console.log('Step 3: Received phone number:', session.phone);
        await ctx.reply(i18n(ctx, 'user_payment_method'));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        const session = ctx.session as MyWizardSession;
        const paymentText = ctx.message.text.toLowerCase();

        if (paymentText !== 'cash' && paymentText !== 'card') {
          await ctx.reply(i18n(ctx, 'invalid_payment_method'));
          return;
        }

        const paymentMethod = paymentText === 'cash' ? PaymentMethod.CASH : PaymentMethod.CARD;
        session.paymentMethod = paymentMethod;

        if (!session.fullName || !session.phone) {
          await ctx.reply(i18n(ctx, 'user_registration_failed'));
          return ctx.scene.leave();
        }

        try {
          await this.usersService.createUser({
            telegramId: ctx.from.id.toString(),
            fullName: session.fullName,
            phone: session.phone,
            paymentMethod,
            language: ctx.session.language || 'uz',
          });

          console.log('✅ User created:', {
            fullName: session.fullName,
            phone: session.phone,
            paymentMethod,
          });

          await ctx.reply(
            i18n(ctx, 'user_registration_success', {
              fullName: session.fullName,
              phone: session.phone,
              paymentMethod: paymentText.charAt(0).toUpperCase() + paymentText.slice(1),
            })
          );
        } catch (error) {
          console.error('❌ Failed to create user:', error);
          await ctx.reply(i18n(ctx, 'error'));
        }

        return ctx.scene.leave();
      })
    );
    console.log('✅ UserRegistrationWizard instantiated');
  }
}