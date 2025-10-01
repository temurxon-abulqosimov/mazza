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
        // Load session from provider
        ctx.session = this.sessionProvider.getSession(telegramId);
      }
      
      // Process the request
      await next();
      
      // Save session changes back to provider
      if (telegramId && ctx.session) {
        this.sessionProvider.setSession(telegramId, ctx.session);
      }
    };
  }
}