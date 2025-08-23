import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { ProductsService } from 'src/products/products.service';
import { SellersService } from 'src/sellers/sellers.service';
import { CreateProductDto } from 'src/products/dto/create-product.dto';
import { getMessage } from 'src/config/messages';
import { cleanAndValidatePrice, validateAndParseTime } from 'src/common/utils/store-hours.util';

@Scene('product-creation')
export class ProductCreationScene {
  constructor(
    private readonly productsService: ProductsService,
    private readonly sellersService: SellersService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
    console.log('Product creation scene entered');
    const language = ctx.session.language || 'uz';
    ctx.session.registrationStep = 'price';
    await ctx.reply(getMessage(language, 'registration.priceRequest'));
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    const step = ctx.session.registrationStep;
    const language = ctx.session.language || 'uz';
    if (!ctx.message || !('text' in ctx.message)) return;

    if (step === 'price') {
      const priceValidation = cleanAndValidatePrice(ctx.message.text);
      if (!priceValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidPrice'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.price = priceValidation.price!;
      ctx.session.registrationStep = 'original_price';

      await ctx.reply(getMessage(language, 'registration.priceSuccess'));
    } else if (step === 'original_price') {
      const originalPriceValidation = cleanAndValidatePrice(ctx.message.text);
      if (!originalPriceValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidOriginalPrice'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.originalPrice = originalPriceValidation.price! > 0 ? originalPriceValidation.price! : undefined;
      ctx.session.registrationStep = 'description';

      await ctx.reply(getMessage(language, 'registration.originalPriceSuccess'));
    } else if (step === 'description') {
      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.description = ctx.message.text;
      ctx.session.registrationStep = 'available_from';

      await ctx.reply(getMessage(language, 'registration.availableFromRequest'));
    } else if (step === 'available_from') {
      const timeValidation = validateAndParseTime(ctx.message.text);
      
      if (!timeValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidTime'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.availableFrom = `${timeValidation.hours!.toString().padStart(2, '0')}:${timeValidation.minutes!.toString().padStart(2, '0')}`;
      ctx.session.registrationStep = 'available_until';

      await ctx.reply(getMessage(language, 'registration.availableUntilRequest'));
    } else if (step === 'available_until') {
      const timeValidation = validateAndParseTime(ctx.message.text);
      
      if (!timeValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidTime'));
      }

      // Create available until date (today at end time)
      const availableUntil = new Date();
      availableUntil.setHours(timeValidation.hours!, timeValidation.minutes!, 0, 0);
      
      // If end time has passed today, set it for tomorrow
      if (availableUntil <= new Date()) {
        availableUntil.setDate(availableUntil.getDate() + 1);
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.availableUntil = availableUntil.toISOString();
      ctx.session.registrationStep = 'quantity';

      await ctx.reply(getMessage(language, 'registration.quantityRequest'), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: getMessage(language, 'actions.skip'), callback_data: 'skip_quantity' },
              { text: getMessage(language, 'actions.confirm'), callback_data: 'enter_quantity' }
            ]
          ]
        }
      });
    } else if (step === 'quantity') {
      const quantity = parseInt(ctx.message.text);
      if (isNaN(quantity) || quantity < 1 || quantity > 10000) {
        return ctx.reply(getMessage(language, 'validation.invalidFormat'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.quantity = quantity;

      // Create product
      await this.createProduct(ctx);
    } else {
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }

  @Action('skip_quantity')
  async onSkipQuantity(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'quantity') return;
    
    if (!ctx.session.productData) {
      ctx.session.productData = {};
    }
    ctx.session.productData.quantity = 1; // Default to 1
    
    // Create product with default quantity
    await this.createProduct(ctx);
  }

  @Action('enter_quantity')
  async onEnterQuantity(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'quantity') return;
    
    const language = ctx.session.language || 'uz';
    await ctx.reply(getMessage(language, 'registration.quantityRequest'));
  }

  private async createProduct(ctx: TelegramContext) {
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.productData?.price || !ctx.session.productData?.description || 
          !ctx.session.productData?.availableUntil || !ctx.session.productData?.quantity) {
        throw new Error('Missing product data');
      }

      const telegramId = ctx.from.id.toString();
      const seller = await this.sellersService.findByTelegramId(telegramId);
      
      if (!seller) {
        throw new Error('Seller not found');
      }

      const createProductDto: CreateProductDto = {
        price: ctx.session.productData.price,
        originalPrice: ctx.session.productData.originalPrice,
        description: ctx.session.productData.description,
        availableFrom: ctx.session.productData.availableFrom,
        availableUntil: ctx.session.productData.availableUntil,
        quantity: ctx.session.productData.quantity,
        sellerId: seller.id
      };

      await this.productsService.create(createProductDto);

      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'success.productCreated'));
      if (ctx.scene) {
        await ctx.scene.leave();
      }
    } catch (error) {
      const language = ctx.session.language || 'uz';
      await ctx.reply(getMessage(language, 'error.productCreationFailed'));
    }
  }
} 