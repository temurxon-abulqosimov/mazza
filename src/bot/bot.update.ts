// src/bot/bot.update.ts
import { Update, Ctx, Start, Command } from 'nestjs-telegraf';
import { BotContext } from './bot.context';
import { Scenes } from 'telegraf';
import { Inject } from '@nestjs/common';

@Update()
export class BotUpdate {
  constructor(
    @Inject('SCENE_STAGE') private readonly stage: Scenes.Stage<BotContext>,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: BotContext) {
    await ctx.reply('Welcome! Use /register to start registration or /debugscenes to list available scenes.');
  }

  @Command('register')
  async onRegister(@Ctx() ctx: BotContext) {
    try {
      await ctx.scene.enter('USER_REGISTRATION_SCENE');
    } catch (error) {
      console.error('Failed to enter scene:', error);
      await ctx.reply('Error: Could not start registration. Please try again.');
    }
  }

  @Command('debugscenes')
  async debugScenes(@Ctx() ctx: BotContext) {
    const scenes = this.stage.scenes;
    await ctx.reply(`Available scenes: ${[...scenes.keys()].join(', ') || 'None'}`);
  }
}