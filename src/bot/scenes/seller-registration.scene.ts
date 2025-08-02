// src/bot/scenes/seller-registration.scene.ts
import { Injectable } from '@nestjs/common';
import { Scenes, Composer } from 'telegraf';
import { BotContext } from '../bot.context';
import { SellersService } from 'src/sellers/sellers.service';
import { i18n } from '../i18n';
import { MyWizardSession } from '../types/session.intreface';
import { BusinessType } from 'src/common/enums/business-type.enum';

@Injectable()
export class SellerRegistrationWizard extends Scenes.WizardScene<BotContext> {
  constructor(private readonly sellersService: SellersService) {
    super(
      'SELLER_REGISTRATION_SCENE', // Ensure this matches
      async (ctx: BotContext) => {
        console.log('Step 1: Asking for seller full name');
        await ctx.reply(i18n(ctx, 'seller_full_name'));
        return ctx.wizard.next();
      },
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in SellerRegistrationWizard step 2');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        session.fullName = ctx.message.text;
        console.log('Step 2: Received full name:', session.fullName);
        await ctx.reply(i18n(ctx, 'seller_phone'));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in SellerRegistrationWizard step 3');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        session.phone = ctx.message.text;
        console.log('Step 3: Received phone number:', session.phone);
        await ctx.reply(i18n(ctx, 'seller_business_type'));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in SellerRegistrationWizard step 4');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        const businessTypeInput = ctx.message.text.toLowerCase();
        const validBusinessTypes = Object.values(BusinessType) as string[];
        if (!validBusinessTypes.includes(businessTypeInput)) {
          await ctx.reply(i18n(ctx, 'invalid_business_type'));
          return;
        }
        session.businessType = businessTypeInput as BusinessType;
        console.log('Step 4: Received business type:', session.businessType);
        await ctx.reply(i18n(ctx, 'share_location'), {
          reply_markup: { keyboard: [[{ text: i18n(ctx, 'share_location_button'), request_location: true }]], one_time_keyboard: true },
        });
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('location', async (ctx) => {
        if (!ctx.from) {
          console.error('ctx.from is undefined in SellerRegistrationWizard step 5');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        if (!ctx.message || !('location' in ctx.message)) {
          console.error('ctx.message or location is undefined in SellerRegistrationWizard step 5');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        session.latitude = ctx.message.location.latitude;
        session.longitude = ctx.message.location.longitude;
        console.log('Step 5: Received location:', { latitude: session.latitude, longitude: session.longitude });

        if (!session.fullName || !session.phone || !session.businessType || !session.latitude || !session.longitude) {
          await ctx.reply(i18n(ctx, 'seller_registration_failed'));
          return ctx.scene.leave();
        }

        try {
          await this.sellersService.createSeller({
            telegramId: ctx.from.id.toString(),
            fullName: session.fullName,
            phone: session.phone,
            businessType: session.businessType,
            latitude: session.latitude,
            longitude: session.longitude,
          });
          console.log('✅ Seller created:', {
            fullName: session.fullName,
            phone: session.phone,
            businessType: session.businessType,
          });
          await ctx.reply(i18n(ctx, 'seller_registration_success'));
        } catch (error) {
          console.error('❌ Failed to create seller:', error);
          await ctx.reply(i18n(ctx, 'error'));
        }

        return ctx.scene.leave();
      })
    );
    console.log('✅ SellerRegistrationWizard instantiated');
  }
}