import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, session, Scenes } from 'telegraf';
import { BotContext } from './bot.context';

@Injectable()
export class BotService implements OnModuleInit {
  constructor(
    @InjectBot() private bot: Telegraf<BotContext>,
  ) {}

  async onModuleInit() {
    // Set up session middleware for scenes
    this.bot.use(session());
    
    // Set up scene middleware with all scenes
    const stage = new Scenes.Stage([
      // Scenes will be registered automatically by nestjs-telegraf
      // The @Scene decorator handles the registration
    ]);
    
    this.bot.use(stage.middleware());
    
    console.log(' Session middleware configured');
    console.log(' Scene middleware configured');
    console.log(' Bot service initialized');
  }

  // Resolve a Telegram file_id to a direct file URL
  async getFileUrl(fileId: string): Promise<string> {
    const link = await this.bot.telegram.getFileLink(fileId);
    // getFileLink returns a URL object or string depending on version; normalize to string
    return typeof link === 'string' ? link : link.href;
  }

  // Add this method to send notifications to admin
  async sendMessageToAdmin(adminTelegramId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(adminTelegramId, message, {
        parse_mode: 'HTML'
      });
      console.log(' Admin notification sent successfully');
    } catch (error) {
      console.error(' Failed to send admin notification:', error);
      throw error;
    }
  }

  // Add this method to send notifications to sellers
  async sendMessageToSeller(sellerTelegramId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(sellerTelegramId, message, {
        parse_mode: 'HTML'
      });
      console.log(' Seller notification sent successfully');
    } catch (error) {
      console.error(' Failed to send seller notification:', error);
      throw error;
    }
  }
}
