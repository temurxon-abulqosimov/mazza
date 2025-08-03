import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { BusinessType } from '../enums/business-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { getMessage } from 'src/config/messages';

export function getLanguageKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🇺🇿 O\'zbekcha', callback_data: 'lang_uz' },
        { text: '🇷🇺 Русский', callback_data: 'lang_ru' }
      ]
    ]
  };
}

export function getRoleKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: getMessage(language, 'roleSelected.user'), callback_data: 'role_user' },
        { text: getMessage(language, 'roleSelected.seller'), callback_data: 'role_seller' }
      ]
    ]
  };
}

export function getBusinessTypeKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  const businessTypes = Object.values(BusinessType);
  const keyboard: any[][] = [];

  for (let i = 0; i < businessTypes.length; i += 2) {
    const row: any[] = [];
    row.push({
      text: getMessage(language, `businessTypes.${businessTypes[i]}`),
      callback_data: `business_${businessTypes[i]}`
    });
    
    if (businessTypes[i + 1]) {
      row.push({
        text: getMessage(language, `businessTypes.${businessTypes[i + 1]}`),
        callback_data: `business_${businessTypes[i + 1]}`
      });
    }
    
    keyboard.push(row);
  }

  return { inline_keyboard: keyboard };
}

export function getPaymentMethodKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  const paymentMethods = Object.values(PaymentMethod);
  const keyboard: any[][] = [];

  for (let i = 0; i < paymentMethods.length; i += 2) {
    const row: any[] = [];
    row.push({
      text: getMessage(language, `paymentMethods.${paymentMethods[i]}`),
      callback_data: `payment_${paymentMethods[i]}`
    });
    
    if (paymentMethods[i + 1]) {
      row.push({
        text: getMessage(language, `paymentMethods.${paymentMethods[i + 1]}`),
        callback_data: `payment_${paymentMethods[i + 1]}`
      });
    }
    
    keyboard.push(row);
  }

  return { inline_keyboard: keyboard };
}

export function getContactKeyboard(language: 'uz' | 'ru'): any {
  return {
    keyboard: [
      [{ text: getMessage(language, 'actions.shareContact'), request_contact: true }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

export function getLocationKeyboard(language: 'uz' | 'ru'): any {
  return {
    keyboard: [
      [{ text: getMessage(language, 'actions.shareLocation'), request_location: true }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

export function getMainMenuKeyboard(language: 'uz' | 'ru'): any {
  return {
    keyboard: [
      [getMessage(language, 'mainMenu.findStores')],
      [getMessage(language, 'mainMenu.myOrders')],
      [getMessage(language, 'mainMenu.postProduct'), getMessage(language, 'mainMenu.myProducts')],
      [getMessage(language, 'mainMenu.support'), getMessage(language, 'mainMenu.language')]
    ],
    resize_keyboard: true
  };
}

export function getStoreListKeyboard(stores: any[], currentPage: number, language: 'uz' | 'ru'): InlineKeyboardMarkup {
  const keyboard: any[][] = [];
  const itemsPerPage = 10;
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStores = stores.slice(startIndex, endIndex);

  // Add store buttons
  currentStores.forEach((store, index) => {
    const storeNumber = startIndex + index + 1;
    keyboard.push([{
      text: `${storeNumber}. ${store.businessName}`,
      callback_data: `store_${store.id}`
    }]);
  });

  // Add pagination
  const totalPages = Math.ceil(stores.length / itemsPerPage);
  const paginationRow: any[] = [];
  
  if (currentPage > 0) {
    paginationRow.push({
      text: '⬅️',
      callback_data: `page_${currentPage - 1}`
    });
  }
  
  paginationRow.push({
    text: `${currentPage + 1}/${totalPages}`,
    callback_data: 'current_page'
  });
  
  if (currentPage < totalPages - 1) {
    paginationRow.push({
      text: '➡️',
      callback_data: `page_${currentPage + 1}`
    });
  }
  
  if (paginationRow.length > 1) {
    keyboard.push(paginationRow);
  }

  return { inline_keyboard: keyboard };
}

export function getProductActionKeyboard(productId: number, language: 'uz' | 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: getMessage(language, 'actions.buy'), callback_data: `buy_${productId}` }],
      [{ text: getMessage(language, 'actions.back'), callback_data: 'back_to_stores' }]
    ]
  };
}

export function getRatingKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '⭐', callback_data: 'rate_1' },
        { text: '⭐⭐', callback_data: 'rate_2' },
        { text: '⭐⭐⭐', callback_data: 'rate_3' },
        { text: '⭐⭐⭐⭐', callback_data: 'rate_4' },
        { text: '⭐⭐⭐⭐⭐', callback_data: 'rate_5' }
      ]
    ]
  };
} 