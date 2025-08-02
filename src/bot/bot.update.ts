// src/bot/bot.update.ts
import { Update, Ctx, Start, Command } from 'nestjs-telegraf';
import { BotContext } from './bot.context';
import { UsersService } from 'src/users/users.service';
import { SellersService } from 'src/sellers/sellers.service';
import { i18n } from './i18n';

@Update()
export class BotUpdate {
  private readonly sceneIds = [
    'USER_REGISTRATION_SCENE',
    'SELLER_REGISTRATION_SCENE',
    'PRODUCT_LISTING_SCENE',
    'STORE_SEARCH_SCENE',
  ];

  constructor(
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
  ) {
    console.log('BotUpdate instantiated');
  }

  @Start()
  async onStart(@Ctx() ctx: BotContext) {
    console.log('Received /start command');
    await ctx.reply(i18n(ctx, 'welcome', {
      commands: '/register, /registerseller, /listproduct, /findstores, /setlanguage',
    }));
  }

  @Command('register')
  async onRegister(@Ctx() ctx: BotContext) {
    console.log('Received /register command');
    try {
      if (!ctx.scene) {
        throw new Error('Scene context is undefined');
      }
      await ctx.scene.enter('USER_REGISTRATION_SCENE');
    } catch (error) {
      console.error('Failed to enter scene:', error);
      await ctx.reply(i18n(ctx, 'error'));
    }
  }

  @Command('registerseller')
  async onRegisterSeller(@Ctx() ctx: BotContext) {
    console.log('Received /registerseller command');
    try {
      if (!ctx.scene) {
        throw new Error('Scene context is undefined');
      }
      await ctx.scene.enter('SELLER_REGISTRATION_SCENE');
    } catch (error) {
      console.error('Failed to enter scene:', error);
      await ctx.reply(i18n(ctx, 'error'));
    }
  }

  @Command('listproduct')
  async onListProduct(@Ctx() ctx: BotContext) {
    console.log('Received /listproduct command');
    try {
      if (!ctx.scene) {
        throw new Error('Scene context is undefined');
      }
      if (!ctx.from) {
        console.error('ctx.from is undefined in /listproduct');
        await ctx.reply(i18n(ctx, 'error'));
        return;
      }
      const seller = await this.sellersService.findByTelegramId(ctx.from.id.toString());
      if (!seller) {
        await ctx.reply(i18n(ctx, 'not_seller'));
        return;
      }
      await ctx.scene.enter('PRODUCT_LISTING_SCENE');
    } catch (error) {
      console.error('Failed to enter scene:', error);
      await ctx.reply(i18n(ctx, 'error'));
    }
  }

  @Command('findstores')
  async onFindStores(@Ctx() ctx: BotContext) {
    console.log('Received /findstores command');
    try {
      if (!ctx.scene) {
        throw new Error('Scene context is undefined');
      }
      if (!ctx.from) {
        console.error('ctx.from is undefined in /findstores');
        await ctx.reply(i18n(ctx, 'error'));
        return;
      }
      const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
      if (!user) {
        await ctx.reply(i18n(ctx, 'not_registered'));
        return;
      }
      await ctx.scene.enter('STORE_SEARCH_SCENE');
    } catch (error) {
      console.error('Failed to enter scene:', error);
      await ctx.reply(i18n(ctx, 'error'));
    }
  }

  @Command('setlanguage')
  async onSetLanguage(@Ctx() ctx: BotContext) {
    console.log('Received /setlanguage command');
    await ctx.reply(i18n(ctx, 'select_language'), {
      reply_markup: {
        keyboard: [[{ text: 'Oʻzbek' }, { text: 'Русский' }]],
        one_time_keyboard: true,
      },
    });
  }

  async onText(@Ctx() ctx: BotContext) {
    if (!ctx.message) {
      console.error('ctx.message is undefined in onText');
      await ctx.reply(i18n(ctx, 'error'));
      return;
    }
    if ('text' in ctx.message) {
      const text = ctx.message.text;
      if (['Oʻzbek', 'Русский'].includes(text)) {
        const language = text === 'Oʻzbek' ? 'uz' : 'ru';
        ctx.session.language = language;
        if (!ctx.from) {
          console.error('ctx.from is undefined in onText');
          await ctx.reply(i18n(ctx, 'error'));
          return;
        }
        const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
        if (user) {
          user.language = language;
          await this.usersService.createUser(user);
          await ctx.reply(i18n(ctx, 'language_set', { language }));
        } else {
          await ctx.reply(i18n(ctx, 'not_registered'));
        }
      }
    }
  }

  @Command('debugscenes')
  async debugScenes(@Ctx() ctx: BotContext) {
    console.log('Received /debugscenes command');
    await ctx.reply(`Available scenes: ${this.sceneIds.join(', ') || 'None'}`);
  }
}