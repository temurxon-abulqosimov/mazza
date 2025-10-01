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
    const stage = new Scenes.Stage();
    
    // Manually register scenes since nestjs-telegraf auto-registration is not working
    const { LanguageScene } = require('./scenes/language.scene');
    const { RoleScene } = require('./scenes/role.scene');
    const { UserRegistrationScene } = require('./scenes/user-registration.scene');
    const { SellerRegistrationScene } = require('./scenes/seller-registration.scene');
    const { ProductCreationScene } = require('./scenes/product-creation.scene');
    const { PhotoChangeScene } = require('./scenes/photo-change.scene');
    
    // Register scenes manually
    stage.register(
      new LanguageScene(),
      new RoleScene(),
      new UserRegistrationScene(),
      new SellerRegistrationScene(),
      new ProductCreationScene(),
      new PhotoChangeScene()
    );
    
    this.bot.use(stage.middleware());
    
    console.log(' Session middleware configured');
    console.log(' Scene middleware configured');
    console.log(' Bot service initialized');
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
