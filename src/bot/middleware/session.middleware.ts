import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { SessionProvider } from '../providers/session.provider';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';

@Injectable()
export class SessionMiddleware {
  constructor(private readonly sessionProvider: SessionProvider) {}

  create() {
    return async (ctx: TelegramContext, next: () => Promise<void>) => {
      const telegramId = ctx.from?.id.toString();
      if (telegramId) {
        ctx.session = this.sessionProvider.getSession(telegramId);
      }
      await next();
    };
  }
} 