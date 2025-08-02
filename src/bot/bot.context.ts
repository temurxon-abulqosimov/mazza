// src/bot/bot.context.ts
import { Context, Scenes } from 'telegraf';

interface MyWizardSession extends Scenes.WizardSessionData {
  fullName?: string;
  phone?: string;
  paymentMethod?: string;
}

interface MySession extends Scenes.SceneSession<MyWizardSession> {
  fullName?: string;
  phone?: string;
  paymentMethod?: string;
}

export interface BotContext extends Context {
  session: MySession;
  scene: Scenes.SceneContextScene<BotContext, MyWizardSession>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}