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
      ],
      [
        { text: getMessage(language, 'actions.back'), callback_data: 'back_to_language' }
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

  // Add back button
  keyboard.push([{
    text: getMessage(language, 'actions.back'),
    callback_data: 'back_to_business_name'
  }]);

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

  // Add back buttons
  keyboard.push([
    {
      text: getMessage(language, 'actions.back'),
      callback_data: 'back_to_store'
    },
    {
      text: getMessage(language, 'actions.backToMainMenu'),
      callback_data: 'back_to_main_menu'
    }
  ]);

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

export function getMainMenuKeyboard(language: 'uz' | 'ru', role?: 'user' | 'seller'): any {
  if (role === 'seller') {
    // Seller menu: My Products, Add Product, My Orders, Support, Language
    return {
      keyboard: [
        [getMessage(language, 'mainMenu.myProducts')],
        [getMessage(language, 'mainMenu.postProduct')],
        [getMessage(language, 'mainMenu.myOrders')],
        [getMessage(language, 'mainMenu.support'), getMessage(language, 'mainMenu.language')]
      ],
      resize_keyboard: true
    };
  } else {
    // User menu: Find Stores, Support, Language (no My Orders since they just buy)
    return {
      keyboard: [
        [getMessage(language, 'mainMenu.findStores')],
        [getMessage(language, 'mainMenu.support'), getMessage(language, 'mainMenu.language')]
      ],
      resize_keyboard: true
    };
  }
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

  // Add back to main menu button
  keyboard.push([{
    text: getMessage(language, 'actions.backToMainMenu'),
    callback_data: 'back_to_main_menu'
  }]);

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

export function getProductListKeyboard(products: any[], language: 'uz' | 'ru'): InlineKeyboardMarkup {
  const keyboard: any[][] = [];
  
  // Add buy buttons for each product
  products.forEach(product => {
    keyboard.push([{
      text: `${getMessage(language, 'actions.buy')} #${product.id}`,
      callback_data: `buy_${product.id}`
    }]);
  });

  // Add back buttons
  keyboard.push([
    {
      text: getMessage(language, 'actions.back'),
      callback_data: 'back_to_stores'
    },
    {
      text: getMessage(language, 'actions.backToMainMenu'),
      callback_data: 'back_to_main_menu'
    }
  ]);

  return { inline_keyboard: keyboard };
}

export function getNoStoresKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: getMessage(language, 'actions.tryAgain'),
          callback_data: 'try_again_location'
        }
      ],
      [
        {
          text: getMessage(language, 'actions.backToMainMenu'),
          callback_data: 'back_to_main_menu'
        }
      ]
    ]
  };
}

export function getSupportKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: getMessage(language, 'actions.backToMainMenu'),
          callback_data: 'back_to_main_menu'
        }
      ]
    ]
  };
}

export function getSkipImageKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: getMessage(language, 'actions.skip'),
          callback_data: 'skip_image'
        }
      ]
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

export function getStoreRatingKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '1⭐️', callback_data: 'rate_store_1' },
        { text: '2⭐️', callback_data: 'rate_store_2' },
        { text: '3⭐️', callback_data: 'rate_store_3' },
        { text: '4⭐️', callback_data: 'rate_store_4' },
        { text: '5⭐️', callback_data: 'rate_store_5' }
      ]
    ]
  };
}

export function getProductRatingKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '1⭐️', callback_data: 'rate_product_1' },
        { text: '2⭐️', callback_data: 'rate_product_2' },
        { text: '3⭐️', callback_data: 'rate_product_3' },
        { text: '4⭐️', callback_data: 'rate_product_4' },
        { text: '5⭐️', callback_data: 'rate_product_5' }
      ]
    ]
  };
}

// Admin Panel Keyboards
export function getAdminMainKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🏪 Barcha do\'konlar', callback_data: 'admin_all_sellers' },
        { text: '⏳ Kutilayotgan do\'konlar', callback_data: 'admin_pending_sellers' }
      ],
      [
        { text: '✅ Tasdiqlangan do\'konlar', callback_data: 'admin_approved_sellers' },
        { text: '❌ Rad etilgan do\'konlar', callback_data: 'admin_rejected_sellers' }
      ],
      [
        { text: '📊 Statistika', callback_data: 'admin_statistics' },
        { text: '🔍 Qidiruv', callback_data: 'admin_search' }
      ],
      [
        { text: '📢 Xabar yuborish', callback_data: 'admin_broadcast' }
      ]
    ]
  };
}

export function getAdminSellerActionKeyboard(sellerId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Tasdiqlash', callback_data: `admin_approve_${sellerId}` },
        { text: '❌ Rad etish', callback_data: `admin_reject_${sellerId}` }
      ],
      [
        { text: '🚫 Bloklash', callback_data: `admin_block_${sellerId}` },
        { text: '📞 Bog\'lanish', callback_data: `admin_contact_${sellerId}` }
      ],
      [
        { text: '📋 Mahsulotlari', callback_data: `admin_seller_products_${sellerId}` },
        { text: '📊 Reytingi', callback_data: `admin_seller_rating_${sellerId}` }
      ],
      [
        { text: '⬅️ Orqaga', callback_data: 'admin_back_to_sellers' }
      ]
    ]
  };
}

export function getAdminSellerDetailsKeyboard(sellerId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Tasdiqlash', callback_data: `admin_approve_${sellerId}` },
        { text: '❌ Rad etish', callback_data: `admin_reject_${sellerId}` }
      ],
      [
        { text: '🚫 Bloklash', callback_data: `admin_block_${sellerId}` },
        { text: '📞 Bog\'lanish', callback_data: `admin_contact_${sellerId}` }
      ],
      [
        { text: '📋 Mahsulotlari', callback_data: `admin_seller_products_${sellerId}` },
        { text: '📊 Reytingi', callback_data: `admin_seller_rating_${sellerId}` }
      ],
      [
        { text: '⬅️ Orqaga', callback_data: 'admin_back_to_main' }
      ]
    ]
  };
}

export function getAdminSellerListKeyboard(sellers: any[], currentPage: number, status?: string): InlineKeyboardMarkup {
  const keyboard: any[][] = [];
  const itemsPerPage = 5;
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSellers = sellers.slice(startIndex, endIndex);

  // Add seller buttons
  currentSellers.forEach((seller, index) => {
    const sellerNumber = startIndex + index + 1;
    const statusEmoji = seller.status === 'pending' ? '⏳' : 
                       seller.status === 'approved' ? '✅' : 
                       seller.status === 'rejected' ? '❌' : '🚫';
    
    keyboard.push([{
      text: `${statusEmoji} ${sellerNumber}. ${seller.businessName}`,
      callback_data: `admin_seller_${seller.id}`
    }]);
  });

  // Add pagination
  const totalPages = Math.ceil(sellers.length / itemsPerPage);
  const paginationRow: any[] = [];
  
  if (currentPage > 0) {
    paginationRow.push({
      text: '⬅️',
      callback_data: `admin_page_${currentPage - 1}_${status || 'all'}`
    });
  }
  
  paginationRow.push({
    text: `${currentPage + 1}/${totalPages}`,
    callback_data: 'admin_current_page'
  });
  
  if (currentPage < totalPages - 1) {
    paginationRow.push({
      text: '➡️',
      callback_data: `admin_page_${currentPage + 1}_${status || 'all'}`
    });
  }
  
  if (paginationRow.length > 1) {
    keyboard.push(paginationRow);
  }

  // Add back button
  keyboard.push([{
    text: '⬅️ Bosh menyuga qaytish',
    callback_data: 'admin_back_to_main'
  }]);

  return { inline_keyboard: keyboard };
}

export function getAdminConfirmationKeyboard(action: string, sellerId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '✅ Ha', callback_data: `admin_confirm_${action}_${sellerId}` },
        { text: '❌ Yo\'q', callback_data: `admin_cancel_${action}_${sellerId}` }
      ]
    ]
  };
}

export function getAdminBroadcastKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '👥 Barcha foydalanuvchilar', callback_data: 'admin_broadcast_all' },
        { text: '🏪 Barcha do\'konlar', callback_data: 'admin_broadcast_sellers' }
      ],
      [
        { text: '👤 Oddiy foydalanuvchilar', callback_data: 'admin_broadcast_users' },
        { text: '✅ Tasdiqlangan do\'konlar', callback_data: 'admin_broadcast_approved' }
      ],
      [
        { text: '⬅️ Orqaga', callback_data: 'admin_back_to_main' }
      ]
    ]
  };
}

export function getAdminLoginKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '🔐 Kirish', callback_data: 'admin_login' }
      ],
      [
        { text: '❌ Bekor qilish', callback_data: 'admin_cancel_login' }
      ]
    ]
  };
}

export function getAdminLogoutKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: '👋 Chiqish', callback_data: 'admin_logout' }
      ]
    ]
  };
} 

export function getOrderConfirmationKeyboard(language: 'uz' | 'ru'): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: getMessage(language, 'actions.backToMainMenu'),
          callback_data: 'back_to_main_menu'
        }
      ]
    ]
  };
} 