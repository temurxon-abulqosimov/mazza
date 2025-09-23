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
    ctx.session.registrationStep = 'product_price';
    await ctx.reply(getMessage(language, 'registration.priceRequest'));
  }

  @On('text')
  async onText(@Ctx() ctx: TelegramContext) {
    const step = ctx.session.registrationStep;
    const language = ctx.session.language || 'uz';
    if (!ctx.message || !('text' in ctx.message)) return;

    if (step === 'product_price') {
      const priceValidation = cleanAndValidatePrice(ctx.message.text);
      if (!priceValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidPrice'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.price = priceValidation.price!;
      ctx.session.registrationStep = 'product_original_price';

      await ctx.reply(getMessage(language, 'registration.priceSuccess'));
    } else if (step === 'product_original_price') {
      const originalPriceValidation = cleanAndValidatePrice(ctx.message.text);
      if (!originalPriceValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidOriginalPrice'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.originalPrice = originalPriceValidation.price! > 0 ? originalPriceValidation.price! : undefined;
      ctx.session.registrationStep = 'product_description';

      await ctx.reply(getMessage(language, 'registration.originalPriceSuccess'));
    } else if (step === 'product_description') {
      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.description = ctx.message.text;
      ctx.session.registrationStep = 'product_available_from';

      await ctx.reply(getMessage(language, 'registration.availableFromRequest'));
    } else if (step === 'product_available_from') {
      const timeValidation = validateAndParseTime(ctx.message.text);
      
      if (!timeValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidTime'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.availableFrom = `${timeValidation.hours!.toString().padStart(2, '0')}:${timeValidation.minutes!.toString().padStart(2, '0')}`;
      ctx.session.registrationStep = 'product_available_until';

      await ctx.reply(getMessage(language, 'registration.availableUntilRequest'));
    } else if (step === 'product_available_until') {
      const timeValidation = validateAndParseTime(ctx.message.text);
      
      if (!timeValidation.isValid) {
        return ctx.reply(getMessage(language, 'validation.invalidTime'));
      }

      // Store the time string for now, convert to Date later
      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.availableUntilTime = `${timeValidation.hours!.toString().padStart(2, '0')}:${timeValidation.minutes!.toString().padStart(2, '0')}`;
      ctx.session.registrationStep = 'product_quantity';

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
    } else if (step === 'product_quantity') {
      // This step should not handle text input directly
      // It should only show the inline keyboard
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    } else if (step === 'product_enter_quantity') {
      const quantity = parseInt(ctx.message.text);
      if (isNaN(quantity) || quantity < 1 || quantity > 10000) {
        return ctx.reply(getMessage(language, 'validation.invalidQuantity'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.quantity = quantity;

      console.log('Enter quantity - setting quantity to:', quantity);

      // Create product
      await this.createProduct(ctx);
    } else {
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }

  @Action('skip_quantity')
  async onSkipQuantity(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    if (!ctx.session.productData) {
      ctx.session.productData = {};
    }
    ctx.session.productData.quantity = 1; // Default to 1
    
    console.log('Skip quantity - setting quantity to 1');
    
    // Create product with default quantity
    await this.createProduct(ctx);
  }

  @Action('enter_quantity')
  async onEnterQuantity(@Ctx() ctx: TelegramContext) {
    if (ctx.session.registrationStep !== 'product_quantity') return;
    
    const language = ctx.session.language || 'uz';
    ctx.session.registrationStep = 'product_enter_quantity';
    await ctx.reply(getMessage(language, 'registration.quantityRequest'));
  }

  private async createProduct(ctx: TelegramContext) {
    try {
      if (!ctx.from) throw new Error('User not found');
      if (!ctx.session.productData?.price || !ctx.session.productData?.description || 
          !ctx.session.productData?.availableUntilTime || !ctx.session.productData?.quantity) {
        throw new Error('Missing product data');
      }

      const telegramId = ctx.from.id.toString();
      const seller = await this.sellersService.findByTelegramId(telegramId);
      
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Create availableFrom date (today at start time)
      let availableFrom: Date | undefined;
      if (ctx.session.productData.availableFrom) {
        const [hours, minutes] = ctx.session.productData.availableFrom.split(':').map(Number);
        availableFrom = new Date();
        availableFrom.setHours(hours, minutes, 0, 0);
        
        // If start time has passed today, set for tomorrow
        if (availableFrom <= new Date()) {
          availableFrom.setDate(availableFrom.getDate() + 1);
        }
      }

      // Create availableUntil date (today at end time)
      let availableUntil: Date;
      if (ctx.session.productData.availableUntilTime) {
        const [hours, minutes] = ctx.session.productData.availableUntilTime.split(':').map(Number);
        availableUntil = new Date();
        availableUntil.setHours(hours, minutes, 0, 0);
        
        // If end time has passed today, set for tomorrow
        if (availableUntil <= new Date()) {
          availableUntil.setDate(availableUntil.getDate() + 1);
        }
      } else {
        // Fallback to current time + 1 day if no time specified
        availableUntil = new Date();
        availableUntil.setDate(availableUntil.getDate() + 1);
      }

      const createProductDto: CreateProductDto = {
        name: ctx.session.productData.description, // Use description as name
        price: ctx.session.productData.price,
        originalPrice: ctx.session.productData.originalPrice,
        description: ctx.session.productData.description,
        availableFrom: availableFrom,
        availableUntil: availableUntil,
        quantity: ctx.session.productData.quantity,
        sellerId: seller.id
      };

      console.log('Creating product with data:', {
        price: createProductDto.price,
        originalPrice: createProductDto.originalPrice,
        description: createProductDto.description,
        availableFrom: createProductDto.availableFrom,
        availableUntil: createProductDto.availableUntil,
        quantity: createProductDto.quantity,
        sellerId: createProductDto.sellerId
      });

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