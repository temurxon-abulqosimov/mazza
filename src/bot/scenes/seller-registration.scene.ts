// src/bot/scenes/seller-registration.scene.ts
import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { getLocationKeyboard, getBusinessTypeKeyboard } from 'src/common/utils/keyboard.util';
import { SellersService } from 'src/sellers/sellers.service';
import { CreateSellerDto } from 'src/sellers/dto/create-seller.dto';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';
import { getMessage } from 'src/config/messages';
import { SessionProvider } from '../providers/session.provider';


@Scene('seller-registration')
export class SellerRegistrationScene {
  constructor(
    private readonly sellersService: SellersService,
    private readonly sessionProvider: SessionProvider,
  ) {}

  private initializeSession(ctx: TelegramContext) {
    if (!ctx.from) return;
    
    const telegramId = ctx.from.id.toString();
    ctx.session = this.sessionProvider.getSession(telegramId);
  }

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    this.initializeSession(ctx);
    const language = ctx.session.language || 'uz';
    ctx.session.registrationStep = 'phone';
    await ctx.reply(getMessage(language, 'registration.phoneRequest'));
  }

  @On('contact')
  async onContact(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'phone') return;
    if (!ctx.message || !('contact' in ctx.message)) return;

    const contact = ctx.message.contact;
    if (!contact.phone_number) {
      const language = ctx.session.language || 'uz';
      return ctx.reply(getMessage(language, 'registration.phoneError'));
    }

    ctx.session.sellerData = { phoneNumber: contact.phone_number };
    ctx.session.registrationStep = 'business_name';

    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'registration.businessNameRequest'));
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    const step = ctx.session.registrationStep;
    const language = ctx.session.language || 'uz';
    if (!ctx.message || !('text' in ctx.message)) return;

    if (step === 'business_name') {
      if (!ctx.session.sellerData) {
        ctx.session.sellerData = {};
      }
      ctx.session.sellerData.businessName = ctx.message.text;
      ctx.session.registrationStep = 'business_type';

      await ctx.reply(getMessage(language, 'registration.businessNameSuccess'), { reply_markup: getBusinessTypeKeyboard(language) });
    } else {
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }

  @Action(/business_(cafe|restaurant|market|bakery|other)/)
  async onBusinessType(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'business_type') return;
    if (!ctx.match) return;

    const businessType = ctx.match[1] as BusinessType;
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    ctx.session.sellerData.businessType = businessType;
    ctx.session.registrationStep = 'location';

    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'registration.locationRequest'), { reply_markup: getLocationKeyboard(language) });
  }

  @On('location')
  async onLocation(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'location') return;
    if (!ctx.message || !('location' in ctx.message)) return;

    const location = ctx.message.location;
    if (!ctx.session.sellerData) {
      ctx.session.sellerData = {};
    }
    ctx.session.sellerData.location = {
      latitude: location.latitude,
      longitude: location.longitude
    };

    // Create seller
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.sellerData.phoneNumber || !ctx.session.sellerData.businessName || 
          !ctx.session.sellerData.businessType || !ctx.session.sellerData.location) {
        throw new Error('Missing seller data');
      }

      const createSellerDto: CreateSellerDto = {
        telegramId: ctx.from.id.toString(),
        phoneNumber: ctx.session.sellerData.phoneNumber,
        businessName: ctx.session.sellerData.businessName,
        businessType: ctx.session.sellerData.businessType,
        location: ctx.session.sellerData.location,
        status: SellerStatus.PENDING,
        language: ctx.session.language
      };

      await this.sellersService.create(createSellerDto);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.sellerRegistration'));
      if (ctx.scene) {
        await ctx.scene.leave();
      }
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.general'));
    }
  }
}