// src/bot/scenes/scenes.module.ts
import { Module } from '@nestjs/common';
import { Scenes } from 'telegraf';
import { BotContext } from '../bot.context';
import { UserRegistrationWizard } from './user-registration.scene';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [
    UserRegistrationWizard,
    {
      provide: 'SCENE_STAGE',
      useFactory: (registrationScene: UserRegistrationWizard) => {
        return new Scenes.Stage<BotContext>([registrationScene]);
      },
      inject: [UserRegistrationWizard],
    },
  ],
  exports: ['SCENE_STAGE'], // ✅ export the token, not the class
})
export class BotScenesModule {}
