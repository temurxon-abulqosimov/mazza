// src/bot/types/session.interface.ts
import { Scenes } from 'telegraf';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Product } from 'src/products/entities/product.entity';
import { BusinessType } from 'src/common/enums/business-type.enum';

export interface MyWizardSession extends Scenes.WizardSessionData {
  fullName?: string;
  phone?: string;
  paymentMethod?: PaymentMethod;
  language?: 'uz' | 'ru';
  businessType?: BusinessType;
  latitude?: number;
  longitude?: number;
  sellerId?: number;
  productName?: string;
  productPrice?: number;
  productDiscountPrice?: number;
  userId?: number;
  sellers?: Seller[];
  selectedSellerId?: number;
  products?: Product[];
}