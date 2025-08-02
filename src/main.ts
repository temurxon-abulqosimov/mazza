// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Telegraf, session } from 'telegraf';
import { BotContext } from './bot/bot.context';
import { Scenes } from 'telegraf';
import { envVariables } from './config/env.variables';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    await app.init();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    // Get SCENES_STAGE from the app context
    const stage = app.get<Scenes.Stage<BotContext>>('SCENE_STAGE');

    // Create Telegraf bot
    if (!envVariables.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined');
    }
    const bot = new Telegraf<BotContext>(envVariables.TELEGRAM_BOT_TOKEN);
    bot.use(session());
    bot.use(stage.middleware());

    // Define bot commands
    bot.start(async (ctx) => {
      console.log('Received /start command'); // Debug
      await ctx.reply('Welcome! Use /register to start registration or /debugscenes to list available scenes.');
    });

    bot.command('register', async (ctx) => {
      console.log('Received /register command'); // Debug
      try {
        await ctx.scene.enter('USER_REGISTRATION_SCENE');
      } catch (error) {
        console.error('Failed to enter scene:', error);
        await ctx.reply('Error: Could not start registration. Please try again.');
      }
    });

    bot.command('debugscenes', async (ctx) => {
      console.log('Received /debugscenes command'); // Debug
      const scenes = stage.scenes;
      await ctx.reply(`Available scenes: ${[...scenes.keys()].join(', ') || 'None'}`);
    });

    // Catch unhandled messages
    bot.on('message', async (ctx) => {
      console.log('Received message:', ctx.message); // Debug
      await ctx.reply('Please use /start, /register, or /debugscenes.');
    });

    
   

    // Start NestJS server
    await app.listen(process.env.PORT || 3000);
    console.log('🚀 NestJS server started on port', process.env.PORT || 3000);

    // Graceful shutdown
    process.once('SIGINT', async () => {
      bot.stop('SIGINT');
      await app.close();
    });
    process.once('SIGTERM', async () => {
      bot.stop('SIGTERM');
      await app.close();
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();