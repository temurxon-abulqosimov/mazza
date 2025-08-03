import { Ctx, Scene, SceneEnter, On, Action } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/interfaces/telegram-context.interface';
import { ProductsService } from 'src/products/products.service';
import { SellersService } from 'src/sellers/sellers.service';
import { CreateProductDto } from 'src/products/dto/create-product.dto';
import { getMessage } from 'src/config/messages';

@Scene('product-creation')
export class ProductCreationScene {
  constructor(
    private readonly productsService: ProductsService,
    private readonly sellersService: SellersService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: TelegramContext) {
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
      const price = parseFloat(ctx.message.text);
      if (isNaN(price) || price <= 0) {
        return ctx.reply(getMessage(language, 'validation.invalidPrice'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.price = price;
      ctx.session.registrationStep = 'original_price';

      await ctx.reply(getMessage(language, 'registration.priceSuccess'));
    } else if (step === 'original_price') {
      const originalPrice = parseFloat(ctx.message.text);
      if (isNaN(originalPrice) || originalPrice < 0) {
        return ctx.reply(getMessage(language, 'validation.invalidOriginalPrice'));
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.originalPrice = originalPrice > 0 ? originalPrice : undefined;
      ctx.session.registrationStep = 'description';

      await ctx.reply(getMessage(language, 'registration.originalPriceSuccess'));
    } else if (step === 'description') {
      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.description = ctx.message.text;
      ctx.session.registrationStep = 'available_until';

      await ctx.reply(getMessage(language, 'registration.descriptionSuccess'));
    } else if (step === 'available_until') {
      const timeText = ctx.message.text;
      const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})$/);
      
      if (!timeMatch) {
        return ctx.reply(getMessage(language, 'validation.invalidTime'));
      }

      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      
      // Create available until date (today at specified time)
      const availableUntil = new Date();
      availableUntil.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, set it for tomorrow
      if (availableUntil <= new Date()) {
        availableUntil.setDate(availableUntil.getDate() + 1);
      }

      if (!ctx.session.productData) {
        ctx.session.productData = {};
      }
      ctx.session.productData.availableUntil = availableUntil.toISOString();

      // Create product
      try {
        if (!ctx.from) throw new Error('User not found');
        if (!ctx.session.productData.price || !ctx.session.productData.description || !ctx.session.productData.availableUntil) {
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
          availableUntil: ctx.session.productData.availableUntil,
          sellerId: seller.id
        };

        await this.productsService.create(createProductDto);

        await ctx.reply(getMessage(language, 'success.productCreated'));
        if (ctx.scene) {
          await ctx.scene.leave();
        }
      } catch (error) {
        await ctx.reply(getMessage(language, 'error.productCreationFailed'));
      }
    } else {
      await ctx.reply(getMessage(language, 'validation.invalidFormat'));
    }
  }
} 