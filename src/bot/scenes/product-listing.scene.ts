// src/bot/scenes/product-listing.scene.ts
import { Injectable } from '@nestjs/common';
import { Scenes, Composer } from 'telegraf';
import { BotContext } from '../bot.context';
import { ProductsService } from 'src/products/products.service';
import { SellersService } from 'src/sellers/sellers.service';
import { i18n } from '../i18n';
import { MyWizardSession } from '../types/session.intreface';

@Injectable()
export class ProductListingWizard extends Scenes.WizardScene<BotContext> {
  constructor(
    private readonly productsService: ProductsService,
    private readonly sellersService: SellersService,
  ) {
    super(
      'PRODUCT_LISTING_SCENE', // Ensure this matches
      async (ctx: BotContext) => {
        console.log('Step 1: Asking for product name');
        await ctx.reply(i18n(ctx, 'product_name'));
        return ctx.wizard.next();
      },
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in ProductListingWizard step 2');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        session.productName = ctx.message.text;
        console.log('Step 2: Received product name:', session.productName);
        await ctx.reply(i18n(ctx, 'product_price'));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in ProductListingWizard step 3');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        const price = parseFloat(ctx.message.text);
        if (isNaN(price) || price <= 0) {
          await ctx.reply(i18n(ctx, 'invalid_price'));
          return;
        }
        session.productPrice = price;
        console.log('Step 3: Received product price:', session.productPrice);
        await ctx.reply(i18n(ctx, 'product_discount_price'));
        return ctx.wizard.next();
      }),
      new Composer<BotContext>().on('text', async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
          console.error('ctx.message or text is undefined in ProductListingWizard step 4');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        const session = ctx.session as MyWizardSession;
        const discountPriceInput = ctx.message.text.toLowerCase();
        let discountPrice: number | undefined;
        if (discountPriceInput !== 'none') {
          discountPrice = parseFloat(discountPriceInput);
          if (isNaN(discountPrice) || discountPrice <= 0) {
            await ctx.reply(i18n(ctx, 'invalid_discount_price'));
            return;
          }
        }
        session.productDiscountPrice = discountPrice;
        console.log('Step 4: Received discount price:', session.productDiscountPrice);

        if (!ctx.from) {
          console.error('ctx.from is undefined in ProductListingWizard step 4');
          await ctx.reply(i18n(ctx, 'error'));
          return ctx.scene.leave();
        }
        if (!session.productName || !session.productPrice) {
          await ctx.reply(i18n(ctx, 'product_list_failed'));
          return ctx.scene.leave();
        }

        try {
          const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
          if (!seller) {
            await ctx.reply(i18n(ctx, 'not_seller'));
            return ctx.scene.leave();
          }
          await this.productsService.createProduct({
            name: session.productName,
            price: session.productPrice,
            discountPrice: session.productDiscountPrice,
            seller,
          });
          console.log('✅ Product listed:', {
            name: session.productName,
            price: session.productPrice,
            discountPrice: session.productDiscountPrice,
          });
          await ctx.reply(i18n(ctx, 'product_listed_success'));
        } catch (error) {
          console.error('❌ Failed to list product:', error);
          await ctx.reply(i18n(ctx, 'product_list_failed'));
        }

        return ctx.scene.leave();
      })
    );
    console.log('✅ ProductListingWizard instantiated');
  }
}