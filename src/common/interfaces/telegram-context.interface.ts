import { Context } from 'telegraf';
import { SessionData } from '../types/session.type';

export interface TelegramContext extends Context {
  session: SessionData;
  scene?: {
    enter: (sceneName: string) => Promise<void>;
    leave: () => Promise<void>;
  };
  match?: RegExpMatchArray;
} 