import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, session } from 'telegraf';
import { BotContext } from './bot.context';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(
    @InjectBot() private bot: Telegraf<BotContext>,
  ) {}

  async onModuleInit() {
    // Set up session middleware for scenes
    this.bot.use(session());
    
    console.log('✅ Session middleware configured');
    console.log('✅ Bot service initialized');
  }
}
