import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Scenes, session } from 'telegraf';
import { BotContext } from './bot.context';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(
    @InjectBot() private bot: Telegraf<BotContext>,
    private readonly stage: Scenes.Stage<BotContext>,
  ) {}

  async onModuleInit() {
    this.bot.use(session());
    this.bot.use(this.stage.middleware());

    this.bot.start(async (ctx) => {
      await ctx.reply('Welcome! 👋');
      await ctx.scene.enter('USER_REGISTRATION_SCENE');
    });
  }
}
