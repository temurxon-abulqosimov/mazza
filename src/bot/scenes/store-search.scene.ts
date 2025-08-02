// src/bot/scenes/store-search.scene.ts
import { Injectable } from '@nestjs/common';
import { Scenes, Composer } from 'telegraf';
import { BotContext } from '../bot.context';
import { SellersService } from 'src/sellers/sellers.service';
import { ProductsService } from 'src/products/products.service';
import { BookingsService } from 'src/bookings/bookings.service';
import { UsersService } from 'src/users/users.service';
import { i18n } from '../i18n';
import { MyWizardSession } from '../types/session.intreface';

@Injectable()
export class StoreSearchWizard extends Scenes.WizardScene<BotContext> {
  constructor(
    private readonly sellersService: SellersService,
    private readonly productsService: ProductsService,
    private readonly bookingsService: BookingsService,
    private readonly usersService: UsersService,
  ) {
    super(
      'STORE_SEARCH_SCENE', // Ensure this matches
      async (ctx: BotContext) => {
        console.log('Step 1: Asking for location');
        if (!ctx.from) {
          console.error('ctx.from is undefined in StoreSearchWizard step 1');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (!user) {
          await ctx.reply(i18n(ctx, 'not_registered'));
          return ctx.scene.leave();
        }
        ctx.session.userId = user.id;
        await ctx.reply(i18n(ctx, 'share_location'), {
          reply_markup: { keyboard: [[{ text: i18n(ctx, 'share_location_button'), request_location: true }]], one_time_keyboard: true },
        });
        return ctx.wizard.next();
      },
      new Composer<BotContext>().on('location', async (ctx) => {
        if (!ctx.message || !('location' in ctx.message)) {
          console.error('ctx.message or location is undefined in StoreSearchWizard step 2');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        session.latitude = ctx.message.location.latitude;
        session.longitude = ctx.message.location.longitude;
        console.log('Step 2: Received location:', { latitude: session.latitude, longitude: session.longitude });

        const sellers = await this.sellersService.findNearby(session.latitude, session.longitude);
        if (!sellers || !sellers.length) {
          await ctx.reply(i18n(ctx, 'no_stores_found'));
          return ctx.scene.leave();
        }

        session.sellers = sellers;
        const sellerList = sellers
          .map((s, i) => `${i + 1}. ${s.fullName} (${s.businessType})`)
          .join('\n');
        await ctx.reply(i18n(ctx, 'select_store', { sellerList }));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in StoreSearchWizard step 3');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        const index = parseInt(ctx.message.text) - 1;
        if (!session.sellers || isNaN(index) || index < 0 || index >= session.sellers.length) {
          await ctx.reply(i18n(ctx, 'invalid_selection'));
          return;
        }

        const seller = session.sellers[index];
        session.selectedSellerId = seller.id;
        const products = await this.productsService.findBySeller(seller.id);
        if (!products.length) {
          await ctx.reply(i18n(ctx, 'no_products_found'));
          return ctx.scene.leave();
        }

        session.products = products;
        const productList = products
          .map((p, i) => `${i + 1}. ${p.name} - ${p.price}${p.discountPrice ? ` (Discount: ${p.discountPrice})` : ''}`)
          .join('\n');
        await ctx.reply(i18n(ctx, 'select_product', { productList }));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in StoreSearchWizard step 4');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        const index = parseInt(ctx.message.text) - 1;
        if (!session.products || isNaN(index) || index < 0 || index >= session.products.length) {
          await ctx.reply(i18n(ctx, 'invalid_selection'));
          return;
        }

        if (!ctx.from) {
          console.error('ctx.from is undefined in StoreSearchWizard step 4');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }

        const product = session.products[index];
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (!user) {
          await ctx.reply(i18n(ctx, 'not_registered'));
          return ctx.scene.leave();
        }

        const existingBookings = await this.bookingsService.findBookingsByUser(user.id);
        if (existingBookings.length >= 10) {
          await ctx.reply(i18n(ctx, 'booking_limit_exceeded'));
          return ctx.scene.leave();
        }

        try {
          const booking = await this.bookingsService.createBooking(user, product);
          console.log('✅ Booking created:', { code: booking.code });
          await ctx.reply(i18n(ctx, 'booking_success', { code: booking.code }));
        } catch (error) {
          console.error('❌ Failed to create booking:', error);
          await ctx.reply(i18n(ctx, 'booking_failed'));
        }

        return ctx.scene.leave();
      })
    );
    console.log('✅ StoreSearchWizard instantiated');
  }
}