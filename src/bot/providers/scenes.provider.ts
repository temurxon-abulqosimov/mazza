import { Provider } from '@nestjs/common';
import { Scenes } from 'telegraf';
import { UsersService } from '../../users/users.service';
import { BotContext } from '../bot.context';
import { UserRegistrationWizard } from '../scenes/user-registration.scene';

export const scenesProvider: Provider = {
    provide: 'SCENE_STAGE',
  useFactory: async (usersService: UsersService) => {
    const userRegistrationWizard = new UserRegistrationWizard(usersService);
    const stage = new Scenes.Stage<BotContext>([userRegistrationWizard]);
    return stage;
  },
  inject: [UsersService],
};
