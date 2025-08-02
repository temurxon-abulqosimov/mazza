// src/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotService } from './bot.service';
import { BotUpdate } from './bot.update';
import { BotScenesModule } from './scenes/scenes.module';
import { Scenes } from 'telegraf';
import { BotContext } from './bot.context';
import { envVariables } from 'src/config/env.variables';
import { Stage } from 'telegraf/typings/scenes';

@Module({
  imports: [
    BotScenesModule, // ✅ Import the module that exports the stage
    TelegrafModule.forRootAsync({
      imports: [BotScenesModule],
      inject: ['SCENE_STAGE'], // ✅ Inject the actual class
      useFactory: async (stage: Scenes.Stage<BotContext>) => ({
        token: envVariables.TELEGRAM_BOT_TOKEN!,
        middlewares: [stage.middleware()],
      }),
    }),
  ],
  providers: [BotService, BotUpdate, Stage],
})
export class BotModule {}
