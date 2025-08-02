// src/bot/scenes/user-registration.scene.ts
import { Injectable } from '@nestjs/common';
import { Scenes, Composer } from 'telegraf';
import { BotContext } from '../bot.context';
import { UsersService } from 'src/users/users.service';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

@Injectable()
export class UserRegistrationWizard extends Scenes.WizardScene<BotContext> {
  constructor(private usersService: UsersService) {
    const step1 = async (ctx: BotContext, next: () => Promise<void>) => {
      console.log('Step 1: Prompting for full name'); // Debug
      await ctx.reply('👋 Welcome! Please enter your full name:');
      return ctx.wizard.next();
    };

    const step2 = new Composer<BotContext>();
    step2.on('text', async (ctx) => {
      console.log('Step 2: Received full name:', ctx.message.text); // Debug
      ctx.session.fullName = ctx.message.text;
      await ctx.reply('📱 Great! Now enter your phone number:');
      return ctx.wizard.next();
    });

    const step3 = new Composer<BotContext>();
    step3.on('text', async (ctx) => {
      console.log('Step 3: Received phone number:', ctx.message.text); // Debug
      ctx.session.phone = ctx.message.text;
      await ctx.reply('💳 Choose a payment method: Cash or Card?');
      return ctx.wizard.next();
    });

    const step4 = new Composer<BotContext>();
    step4.on('text', async (ctx) => {
      console.log('Step 4: Received payment method:', ctx.message.text); // Debug
      const payment = ctx.message.text.toLowerCase();
      if (payment !== 'cash' && payment !== 'card') {
        await ctx.reply('❌ Invalid payment method. Please type "Cash" or "Card".');
        return;
      }

      const paymentMethod = payment === 'cash' ? PaymentMethod.CASH : PaymentMethod.CARD;
      ctx.session.paymentMethod = payment;

      if (!ctx.session.fullName || !ctx.session.phone) {
        await ctx.reply('Error: Missing user data.');
        return ctx.scene.leave();
      }

      try {
        await this.usersService.createUser({
          fullName: ctx.session.fullName,
          phone: ctx.session.phone,
          paymentMethod,
        });
        console.log('User created:', { fullName: ctx.session.fullName, phone: ctx.session.phone, paymentMethod }); // Debug
      } catch (error) {
        console.error('Failed to create user:', error);
        await ctx.reply('Error: Could not save user data. Please try again.');
        return ctx.scene.leave();
      }

      await ctx.reply(
        `✅ Registration complete!\n\n👤 Name: ${ctx.session.fullName}\n📞 Phone: ${ctx.session.phone}\n💳 Payment: ${ctx.session.paymentMethod}`
      );
      return ctx.scene.leave();
    });

    super('USER_REGISTRATION_SCENE', step1, step2, step3, step4);
    console.log('UserRegistrationWizard instantiated'); // Debug
  }
}