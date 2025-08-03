import { UserRole } from '../enums/user-role.enum';
import { BusinessType } from '../enums/business-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

export interface SessionData {
  language: 'uz' | 'ru';
  role?: UserRole;
  registrationStep?: string;
  action?: string;
  userData?: {
    phoneNumber?: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    paymentMethod?: PaymentMethod;
  };
  sellerData?: {
    phoneNumber?: string;
    businessName?: string;
    businessType?: BusinessType;
    location?: {
      latitude: number;
      longitude: number;
    };
    opensAt?: number;
    closesAt?: number;
  };
  productData?: {
    price?: number;
    originalPrice?: number;
    description?: string;
    availableUntil?: string;
  };
  currentPage?: number;
  selectedStoreId?: number;
  selectedProductId?: number;
  selectedPaymentMethod?: string;
} 