export const messages = {
  uz: {
    // Welcome and Language Selection
    welcome: '🎉 Xush kelibsiz! Ulgurib Qol botiga xush kelibsiz!',
    selectLanguage: '🇺🇿 Tilni tanlang / 🇷🇺 Выберите язык\n\n🇺🇿 O\'zbekcha yoki rus tilini tanlang\n🇷🇺 Выберите узбекский или русский язык',
    languageSelected: '✅ Til tanlandi! Endi rolingizni tanlang:',
    
    // Role Selection
    selectRole: '👤 Foydalanuvchi yoki sotuvchi sifatida ro\'yxatdan o\'ting',
    roleSelected: {
      user: '👤 Foydalanuvchi sifatida ro\'yxatdan o\'tish',
      seller: '🏪 Sotuvchi sifatida ro\'yxatdan o\'tish',
      confirmation: '✅ {role} tanlandi! Ro\'yxatdan o\'tish jarayonini boshlaymiz...'
    },
    
    // Registration Steps
    registration: {
      phoneRequest: '📱 Iltimos, telefon raqamingizni yuboring:',
      phoneSuccess: '✅ Telefon raqam qabul qilindi! Endi manzilingizni yuboring:',
      phoneError: '❌ Telefon raqami topilmadi. Iltimos, qaytadan urinib ko\'ring.',
      locationRequest: '📍 Manzilingizni yuboring:',
      locationSuccess: '✅ Manzil qabul qilindi! Endi to\'lov usulini tanlang:',
      paymentRequest: '💳 To\'lov usulini tanlang:',
      businessNameRequest: '✅ Telefon raqam qabul qilindi! Endi biznes nomingizni kiriting:',
      businessNameSuccess: '✅ Biznes nomi qabul qilindi! Endi biznes turini tanlang:',
      businessTypeRequest: '✅ Biznes turi qabul qilindi! Endi ochilish vaqtini kiriting (HH:MM formatida):',
      opensAtSuccess: '✅ Ochiq vaqti qabul qilindi! Endi yopilish vaqtini kiriting (HH:MM):',
      closesAtSuccess: '✅ Yopilish vaqti qabul qilindi! Endi manzilingizni yuboring:',
      priceRequest: '💰 Mahsulot narxini kiriting (so\'mda):',
      priceSuccess: '✅ Narx qabul qilindi! Asl narxni kiriting (agar chegirma bo\'lsa, aks holda 0):',
      originalPriceSuccess: '✅ Asl narx qabul qilindi! Mahsulot haqida qisqacha ma\'lumot kiriting:',
      descriptionSuccess: '✅ Ma\'lumot qabul qilindi! Mahsulot mavjud bo\'lish vaqtini kiriting (HH:MM):',
      availableUntilSuccess: '✅ Vaqt qabul qilindi! Mahsulot yaratilmoqda...'
    },
    
    // Validation Messages
    validation: {
      invalidPrice: '❌ Noto\'g\'ri narx. Iltimos, musbat son kiriting:',
      invalidOriginalPrice: '❌ Noto\'g\'ri narx. Iltimos, 0 yoki musbat son kiriting:',
      invalidTime: '❌ Noto\'g\'ri format. Iltimos, HH:MM formatida kiriting (masalan: 09:00):',
      invalidFormat: '❌ Iltimos, to\'g\'ri formatda ma\'lumot yuboring.',
      phoneFormat: 'Telefon raqami O\'zbekiston formati bo\'lishi kerak (masalan: +998 90 123 45 67)',
      businessNameFormat: 'Biznes nomi faqat harflar, raqamlar va bo\'shliqlardan iborat bo\'lishi kerak'
    },
    
    // Success Messages
    success: {
      userRegistration: '✅ Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi! Asosiy menyuga o\'tish uchun /start buyrug\'ini bosing.',
      sellerRegistration: '✅ Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi! Ma\'muriyat tasdiqlashini kutmoqda. Asosiy menyuga o\'tish uchun /start buyrug\'ini bosing.',
      productCreated: '✅ Mahsulot muvaffaqiyatli qo\'shildi!',
      orderCreated: '✅ Buyurtma qabul qilindi!\n\n📋 Buyurtma kodi: {code}\n💰 Narxi: {price} so\'m\n\nBu kodni sotuvchiga ko\'rsating.',
      ratingSubmitted: '⭐ Baho qo\'yildi: {rating}/5'
    },
    
    // Error Messages
    error: {
      general: '❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.',
      userNotFound: '❌ Avval ro\'yxatdan o\'ting.',
      locationNotFound: '❌ Manzil topilmadi. Iltimos, qaytadan ro\'yxatdan o\'ting.',
      sellerNotFound: '❌ Siz sotuvchi emassiz.',
      sellerNotApproved: '❌ Sizning akkauntingiz hali tasdiqlanmagan.',
      productNotFound: '❌ Mahsulot topilmadi.',
      storeNotFound: '❌ Do\'kon topilmadi.',
      noStoresNearby: '😔 Yaqin atrofda do\'kon topilmadi.',
      noOrders: '📋 Sizda hali buyurtmalar yo\'q.',
      noProducts: '📦 Sizda hali mahsulotlar yo\'q.',
      orderCreationFailed: '❌ Buyurtma yaratishda xatolik yuz berdi.',
      productCreationFailed: '❌ Mahsulot qo\'shishda xatolik yuz berdi.',
      ratingFailed: '❌ Baho qo\'yishda xatolik yuz berdi.',
      productNotSelected: '❌ Mahsulot tanlanmagan.'
    },
    
    // Main Menu
    mainMenu: {
      welcome: '🎉 Xush kelibsiz! Asosiy menyu:',
      findStores: '🏪 Do\'konlarni topish',
      myOrders: '📋 Mening buyurtmalarim',
      postProduct: '📦 Mahsulot qo\'shish',
      myProducts: '📋 Mening mahsulotlarim',
      support: '💬 Qo\'llab-quvvatlash',
      language: '🌐 Tilni o\'zgartirish'
    },
    
    // Store Discovery
    stores: {
      nearbyStores: '🏪 Yaqin do\'konlar:\n\n{storeList}',
      storeDetails: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}\n\n{productsList}',
      noProductsAvailable: '😔 Hozirda mahsulot mavjud emas.',
      availableProducts: '📦 Mavjud mahsulotlar:\n{productsList}',
      storeItem: '{number}. {businessName}\n📍 {businessType} | {distance} km | {status}\n\n',
      openStatus: '🟢 Ochiq',
      closedStatus: '🔴 Yopiq'
    },
    
    // Orders
    orders: {
      myOrders: '📋 Mening buyurtmalarim:\n\n{ordersList}',
      orderItem: '{number}. Kod: {code}\n   💰 {price} so\'m\n   📅 {date}\n\n',
      noOrders: '📋 Sizda hali buyurtmalar yo\'q.'
    },
    
    // Products
    products: {
      myProducts: '📦 Mening mahsulotlarim:\n\n{productsList}',
      productItem: '{number}. 💰 {price} so\'m\n   📅 {date}\n\n',
      noProducts: '📦 Sizda hali mahsulotlar yo\'q.',
      productWithDiscount: '{number}. {price} so\'m ({discount}% chegirma)\n',
      productWithoutDiscount: '{number}. {price} so\'m\n'
    },
    
    // Support
    support: {
      support: '💬 Qo\'llab-quvvatlash: {username}',
      suggestions: '💡 Takliflar uchun: {username}',
      complains: '⚠️ Shikoyatlar uchun: {username}'
    },
    
    // Commands
    commands: {
      invalidCommand: '❌ Noto\'g\'ri buyruq. Iltimos, menyudan tanlang.'
    },
    
    // Business Types
    businessTypes: {
      cafe: '☕️ Kafe',
      restaurant: '🍽️ Restoran',
      market: '🛒 Do\'kon',
      bakery: '🥖 Nonvoyxona',
      other: '🏪 Boshqa'
    },
    
    // Payment Methods
    paymentMethods: {
      cash: '💵 Naqd pul',
      card: '💳 Karta',
      click: '📱 Click',
      payme: '📱 Payme'
    },
    
    // Actions
    actions: {
      shareLocation: '📍 Manzilni yuborish',
      shareContact: '📱 Kontaktni yuborish',
      buy: '🛒 Sotib olish',
      back: '⬅️ Orqaga'
    }
  },
  
  ru: {
    // Welcome and Language Selection
    welcome: '🎉 Добро пожаловать! Добро пожаловать в бот Ulgurib Qol!',
    selectLanguage: '🇺🇿 Tilni tanlang / 🇷🇺 Выберите язык\n\n🇺🇿 O\'zbekcha yoki rus tilini tanlang\n🇷🇺 Выберите узбекский или русский язык',
    languageSelected: '✅ Язык выбран! Теперь выберите вашу роль:',
    
    // Role Selection
    selectRole: '👤 Зарегистрируйтесь как пользователь или продавец',
    roleSelected: {
      user: '👤 Регистрация как пользователь',
      seller: '🏪 Регистрация как продавец',
      confirmation: '✅ {role} выбран! Начинаем процесс регистрации...'
    },
    
    // Registration Steps
    registration: {
      phoneRequest: '📱 Пожалуйста, отправьте ваш номер телефона:',
      phoneSuccess: '✅ Номер телефона принят! Теперь отправьте ваше местоположение:',
      phoneError: '❌ Номер телефона не найден. Пожалуйста, попробуйте снова.',
      locationRequest: '📍 Отправьте местоположение:',
      locationSuccess: '✅ Местоположение принято! Теперь выберите способ оплаты:',
      paymentRequest: '💳 Выберите способ оплаты:',
      businessNameRequest: '✅ Номер телефона принят! Теперь введите название вашего бизнеса:',
      businessNameSuccess: '✅ Название бизнеса принято! Теперь выберите тип бизнеса:',
      businessTypeRequest: '✅ Тип бизнеса принят! Теперь введите время открытия (в формате ЧЧ:ММ):',
      opensAtSuccess: '✅ Время открытия принято! Теперь введите время закрытия (ЧЧ:ММ):',
      closesAtSuccess: '✅ Время закрытия принято! Теперь отправьте ваше местоположение:',
      priceRequest: '💰 Введите цену товара (в сумах):',
      priceSuccess: '✅ Цена принята! Введите оригинальную цену (если есть скидка, иначе 0):',
      originalPriceSuccess: '✅ Оригинальная цена принята! Введите краткую информацию о товаре:',
      descriptionSuccess: '✅ Информация принята! Введите время доступности товара (ЧЧ:ММ):',
      availableUntilSuccess: '✅ Время принято! Создание товара...'
    },
    
    // Validation Messages
    validation: {
      invalidPrice: '❌ Неправильная цена. Пожалуйста, введите положительное число:',
      invalidOriginalPrice: '❌ Неправильная цена. Пожалуйста, введите 0 или положительное число:',
      invalidTime: '❌ Неправильный формат. Пожалуйста, введите в формате ЧЧ:ММ (например: 09:00):',
      invalidFormat: '❌ Пожалуйста, отправьте информацию в правильном формате.',
      phoneFormat: 'Номер телефона должен быть в формате Узбекистана (например: +998 90 123 45 67)',
      businessNameFormat: 'Название бизнеса должно содержать только буквы, цифры и пробелы'
    },
    
    // Success Messages
    success: {
      userRegistration: '✅ Регистрация успешно завершена! Нажмите /start для перехода в главное меню.',
      sellerRegistration: '✅ Регистрация успешно завершена! Ожидаем подтверждения администрации. Нажмите /start для перехода в главное меню.',
      productCreated: '✅ Товар успешно добавлен!',
      orderCreated: '✅ Заказ принят!\n\n📋 Код заказа: {code}\n💰 Цена: {price} сум\n\nПокажите этот код продавцу.',
      ratingSubmitted: '⭐ Оценка поставлена: {rating}/5'
    },
    
    // Error Messages
    error: {
      general: '❌ Произошла ошибка. Пожалуйста, попробуйте снова.',
      userNotFound: '❌ Сначала зарегистрируйтесь.',
      locationNotFound: '❌ Местоположение не найдено. Пожалуйста, зарегистрируйтесь заново.',
      sellerNotFound: '❌ Вы не продавец.',
      sellerNotApproved: '❌ Ваш аккаунт еще не подтвержден.',
      productNotFound: '❌ Товар не найден.',
      storeNotFound: '❌ Магазин не найден.',
      noStoresNearby: '😔 Поблизости магазинов не найдено.',
      noOrders: '📋 У вас пока нет заказов.',
      noProducts: '📦 У вас пока нет товаров.',
      orderCreationFailed: '❌ Ошибка при создании заказа.',
      productCreationFailed: '❌ Ошибка при добавлении товара.',
      ratingFailed: '❌ Ошибка при выставлении оценки.',
      productNotSelected: '❌ Товар не выбран.'
    },
    
    // Main Menu
    mainMenu: {
      welcome: '🎉 Добро пожаловать! Главное меню:',
      findStores: '🏪 Найти магазины',
      myOrders: '📋 Мои заказы',
      postProduct: '📦 Добавить товар',
      myProducts: '📋 Мои товары',
      support: '💬 Поддержка',
      language: '🌐 Изменить язык'
    },
    
    // Store Discovery
    stores: {
      nearbyStores: '🏪 Ближайшие магазины:\n\n{storeList}',
      storeDetails: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}\n\n{productsList}',
      noProductsAvailable: '😔 В данный момент товары недоступны.',
      availableProducts: '📦 Доступные товары:\n{productsList}',
      storeItem: '{number}. {businessName}\n📍 {businessType} | {distance} км | {status}\n\n',
      openStatus: '🟢 Открыт',
      closedStatus: '🔴 Закрыт'
    },
    
    // Orders
    orders: {
      myOrders: '📋 Мои заказы:\n\n{ordersList}',
      orderItem: '{number}. Код: {code}\n   💰 {price} сум\n   📅 {date}\n\n',
      noOrders: '📋 У вас пока нет заказов.'
    },
    
    // Products
    products: {
      myProducts: '📦 Мои товары:\n\n{productsList}',
      productItem: '{number}. 💰 {price} сум\n   📅 {date}\n\n',
      noProducts: '📦 У вас пока нет товаров.',
      productWithDiscount: '{number}. {price} сум ({discount}% скидка)\n',
      productWithoutDiscount: '{number}. {price} сум\n'
    },
    
    // Support
    support: {
      support: '💬 Поддержка: {username}',
      suggestions: '💡 Для предложений: {username}',
      complains: '⚠️ Для жалоб: {username}'
    },
    
    // Commands
    commands: {
      invalidCommand: '❌ Неправильная команда. Пожалуйста, выберите из меню.'
    },
    
    // Business Types
    businessTypes: {
      cafe: '☕️ Кафе',
      restaurant: '🍽️ Ресторан',
      market: '🛒 Магазин',
      bakery: '🥖 Пекарня',
      other: '🏪 Другое'
    },
    
    // Payment Methods
    paymentMethods: {
      cash: '💵 Наличные',
      card: '💳 Карта',
      click: '📱 Click',
      payme: '📱 Payme'
    },
    
    // Actions
    actions: {
      shareLocation: '📍 Отправить местоположение',
      shareContact: '📱 Отправить контакт',
      buy: '🛒 Купить',
      back: '⬅️ Назад'
    }
  }
};

export const getMessage = (language: 'uz' | 'ru', key: string, params?: Record<string, any>): string => {
  const keys = key.split('.');
  let message: any = messages[language];
  
  for (const k of keys) {
    message = message[k];
    if (!message) {
      return key; // Return key if message not found
    }
  }
  
  if (typeof message === 'string' && params) {
    return Object.keys(params).reduce((msg, param) => {
      return msg.replace(`{${param}}`, params[param]);
    }, message);
  }
  
  return message as string;
}; 