export const messages = {
  uz: {
    // Welcome and Language Selection
    welcome: {
      newUser: '👋 Xush kelibsiz! Iltimos, tilni tanlang:\n\nWelcome! Please select your language:',
      back: '👋 Xush kelibsiz! Asosiy menyu:',
    },
    selectLanguage: '🇺🇿 Tilni tanlang / 🇷🇺 Выберите язык\n\n🇺🇿 O\'zbekcha yoki rus tilini tanlang\n🇷🇺 Выберите узбекский или русский язык',
    languageSelected: '✅ Til tanlandi! Endi rolingizni tanlang:',
    
    // Role Selection
    selectRole: '👤 Rolingizni tanlang:',
    roleSelected: {
      user: 'Mijoz',
      seller: 'Sotuvchi',
      confirmation: '✅ {role} tanlandi! Ro\'yxatdan o\'tish jarayonini boshlaymiz...'
    },
    
    // Registration Steps
    registration: {
      phoneRequest: '📱 Iltimos, telefon raqamingizni yuboring:',
      phoneSuccess: '✅ Telefon raqam qabul qilindi! Endi to\'lov usulini tanlang:',
      phoneError: '❌ Telefon raqami topilmadi. Iltimos, qaytadan urinib ko\'ring.',
      storeImageRequest: '📸 Iltimos, do\'koningizning suratini yuboring (ixtiyoriy):',
      changePhotoRequest: '📸 Iltimos, do\'koningizning yangi suratini yuboring:',
      photoChangedSuccess: '✅ Do\'kon surati muvaffaqiyatli o\'zgartirildi!',
      locationRequest: '📍 Manzilingizni yuboring:',
      locationSuccess: '✅ Manzil qabul qilindi! Endi to\'lov usulini tanlang:',
      paymentRequest: '💳 To\'lov usulini tanlang:',
      businessNameRequest: '✅ Telefon raqam qabul qilindi! Endi biznes nomingizni kiriting:',
      businessNameSuccess: '✅ Biznes nomi qabul qilindi! Endi biznes turini tanlang:',
      businessTypeRequest: '✅ Biznes turi qabul qilindi! Endi manzilingizni yuboring:',
      priceRequest: '💰 Mahsulot narxini kiriting (masalan: 50000):',
      priceSuccess: '✅ Narx qabul qilindi! Asl narxni kiriting (agar chegirma bo\'lsa, aks holda 0):',
      originalPriceSuccess: '✅ Asl narx qabul qilindi! Mahsulot haqida qisqacha ma\'lumot kiriting:',
      descriptionSuccess: '✅ Ma\'lumot qabul qilindi! Mahsulot mavjud bo\'lish vaqtini kiriting (HH:MM):',
      availableFromRequest: '🕐 Mahsulot mavjud bo\'lish vaqtini kiriting (masalan: 09:00):',
      availableUntilRequest: '🕐 Mahsulot mavjud bo\'lish tugash vaqtini kiriting (masalan: 18:00):',
      availableUntilSuccess: '✅ Vaqt qabul qilindi! Mahsulot yaratilmoqda...',
      quantityRequest: '🔢 Mahsulot miqdorini kiriting (masalan: 10) yoki o\'tkazib yuboring:',
      quantitySuccess: '✅ Miqdor qabul qilindi! Mahsulot yaratilmoqda...'
    },
    
    // Validation Messages
    validation: {
      invalidPrice: '❌ Noto\'g\'ri narx. Iltimos, musbat son kiriting (masalan: 50000):',
      invalidOriginalPrice: '❌ Noto\'g\'ri narx. Iltimos, 0 yoki musbat son kiriting (masalan: 50000):',
      invalidTime: '❌ Noto\'g\'ri format. Iltimos, HH:MM yoki H:MM formatida kiriting (masalan: 9:00, 22:30):',
      invalidQuantity: '❌ Noto\'g\'ri miqdor. Iltimos, 1-10000 oralig\'ida son kiriting:',
      invalidFormat: '❌ Iltimos, to\'g\'ri formatda ma\'lumot yuboring.',
      phoneFormat: 'Telefon raqami O\'zbekiston formati bo\'lishi kerak (masalan: +998 90 123 45 67)',
      businessNameFormat: 'Biznes nomi faqat harflar, raqamlar va bo\'shliqlardan iborat bo\'lishi kerak'
    },
    
    // Success Messages
    success: {
      userRegistration: '✅ Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi! Do\'konlarni topish uchun "Do\'konlarni topish" tugmasini bosing. Manzilingizni faqat do\'konlarni qidirayotganda yuborishingiz kerak.',
      sellerRegistration: '✅ Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi! Ma\'muriyat tasdiqlashini kutmoqda. Asosiy menyuga o\'tish uchun /start buyrug\'ini bosing.',
      productCreated: '✅ Mahsulot muvaffaqiyatli qo\'shildi!',
      productDetails: '📦 Mahsulot ma\'lumotlari:\n\n🔢 Kod: {code}\n📝 Tavsif: {description}\n💰 Narxi: {price} so\'m\n🔢 Miqdor: {quantity} ta\n⏰ Mavjud vaqti: {timeRange}',
      orderCreated: '✅ Buyurtma qabul qilindi!\n\n📋 Buyurtma kodi: {code}\n🔢 Mahsulot kodi: {productCode}\n💰 Narxi: {price} so\'m\n\nBuyurtma kodini sotuvchiga ko\'rsating. To\'lov usuli sotuvchi bilan kelishiladi.',
      ratingSubmitted: '⭐ Baho qo\'yildi: {rating}/5',
      productRatingSubmitted: '✅ Bahoyingiz uchun rahmat! Mahsulot bahosi: {rating}/5',
      productRatingRequest: '⭐ Mahsulotni olganingizdan so\'ng uni baholang:',
      storeRatingSubmitted: '✅ Bahoyingiz uchun rahmat! Do\'kon bahosi: {rating}/5',
      storeRatingRequest: '⭐ Do\'konni baholang:',
      storeImageUploaded: '✅ Do\'kon surati muvaffaqiyatli yuklandi!',
      languageChanged: '✅ Til muvaffaqiyatli o\'zgartirildi!'
    },
    
    // Info Messages
    info: {
      sellerPending: '⏳ Sizning akkauntingiz hali tasdiqlanmagan, lekin mahsulot qo\'shishingiz mumkin.'
    },
    
    // Error Messages
    error: {
      general: '❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.',
      userNotFound: '❌ Avval ro\'yxatdan o\'ting.',
      userAlreadyExists: '❌ Siz allaqachon ro\'yxatdan o\'tgansiz.',
      locationNotFound: '❌ Manzil topilmadi. Iltimos, do\'konlarni qidirayotganda manzilingizni yuboring.',
      sellerNotFound: '❌ Siz sotuvchi emassiz.',
      sellerAlreadyExists: '❌ Siz allaqachon sotuvchi sifatida ro\'yxatdan o\'tgansiz.',
      sellerNotApproved: '❌ Sizning akkauntingiz hali tasdiqlanmagan.',
      sellersCannotFindStores: '❌ Sotuvchilar do\'konlarni topa olmaydi. Siz o\'zingiz do\'konsiz!',
      productNotFound: '❌ Mahsulot topilmadi.',
      storeNotFound: '❌ Do\'kon topilmadi.',
      noStoresNearby: '😔 Yaqin atrofda do\'kon topilmadi. Boshqa joyda sinab ko\'ring yoki keyinroq qaytib keling.',
      noStoresWithProducts: '😔 Hozirda mavjud mahsulotlari bo\'lgan do\'konlar yo\'q. Keyinroq qaytib keling.',
      noOrders: '📋 Sizda hali buyurtmalar yo\'q.',
      noProducts: '📦 Sizda hali mahsulotlar yo\'q.',
      orderCreationFailed: '❌ Buyurtma yaratishda xatolik yuz berdi.',
      productCreationFailed: '❌ Mahsulot qo\'shishda xatolik yuz berdi.',
      ratingFailed: '❌ Baho qo\'yishda xatolik yuz berdi.',
      alreadyRated: '❌ Siz allaqachon bu do\'konni baholagansiz.',
      productNotSelected: '❌ Mahsulot tanlanmagan.',
      storeNotSelected: '❌ Do\'kon tanlanmagan.',
      paymentMethodNotSelected: '❌ To\'lov usuli tanlanmagan. (Bu xabar endi ko\'rsatilmaydi)',
      photoProcessingFailed: '❌ Surat qayta ishlashda xatolik yuz berdi.',
      productOutOfStock: '❌ Bu mahsulot hozirda mavjud emas.'
    },
    
    // Main Menu
    mainMenu: {
      welcome: '🎉 Xush kelibsiz! Asosiy menyu:',
      findStores: '🏪 Do\'konlarni topish',
      myOrders: '📋 Mening buyurtmalarim',
      postProduct: '📦 Mahsulot qo\'shish',
      myProducts: '📋 Mening mahsulotlarim',
      statistics: '📊 Statistika',
      support: '💬 Qo\'llab-quvvatlash',
      language: '🌐 Tilni o\'zgartirish',
      changePhoto: '📸 Do\'kon suratini o\'zgartirish'
    },
    
    // Store Discovery
    stores: {
      nearbyStores: '🏪 Yaqin do\'konlar:\n\n{storeList}',
      storeDetails: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}\n\n{productsList}',
      storeDetailsHeader: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}',
      storeDetailsWithImage: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}',
      noProductsAvailable: '😔 Hozirda mahsulot mavjud emas.',
      availableProducts: '📦 Mavjud mahsulotlar:\n{productsList}',
      requestLocation: '📍 Do\'konlarni topish uchun hozirgi manzilingizni yuboring:',
      storeItem: '{number}. {businessName}\n📍 {businessType} | {distance}\n\n',
      noProducts: 'Mahsulot yo\'q',

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
      productItemWithBuy: '🛍️ <b>Mahsulot #{number} | Kod: {code}</b>\n{originalPriceText}\n📝 {description}\n⏰ Mavjud: {availableUntil}\n🔢 Miqdor: {quantity} ta\n━━━━━━━━━━━━━━━━━━━━━━━━\n',
      noProducts: '📦 Sizda hali mahsulotlar yo\'q.',
      productWithDiscount: '{number}. {price} so\'m ({discount}% chegirma)\n',
      productWithoutDiscount: '{number}. {price} so\'m\n',
      statistics: '📊 Sizning statistikangiz:\n\n📦 Jami mahsulotlar: {totalProducts}\n✅ Faol mahsulotlar: {activeProducts}\n❌ Muddat o\'tgan: {expiredProducts}\n📋 Jami buyurtmalar: {totalOrders}\n💰 Jami tushum: {totalRevenue} so\'m\n⭐ O\'rtacha baho: {averageRating}/5\n📊 Do\'kon bahosi: {storeRating}/5'
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
      back: '⬅️ Orqaga',
      backToMainMenu: '🏠 Asosiy menyu',
      tryAgain: '🔄 Qaytadan urinish',
      skip: '⏭️ O\'tkazib yuborish',
      confirm: '✅ Ha',
      cancel: '❌ Yo\'q',
      minus: '➖',
      plus: '➕',
      cancelled: '❌ Bekor qilindi'
    },

    // Purchase
    purchase: {
      selectPaymentMethod: '🛒 {productName}\n💰 Narxi: {price} so\'m\n\n💳 To\'lov usulini tanlang:',
      paymentMethodNotNeeded: '💳 To\'lov usuli endi avtomatik tanlanadi. Buyurtma to\'g\'ridan-to\'g\'ri yaratiladi.',
      selectQuantity: '🛒 {productName}\n💰 Narxi: {price} so\'m\n🔢 Maksimal miqdor: {maxQuantity} ta\n\n🔢 Miqdorni tanlang:',
      confirmPurchase: '🛒 Buyurtmani tasdiqlash:\n\n📦 Mahsulot: {productName}\n🔢 Miqdor: {quantity}\n💰 Jami narx: {totalPrice} so\'m\n\n✅ Tasdiqlash uchun "Ha" tugmasini bosing\n❌ Bekor qilish uchun "Yo\'q" tugmasini bosing'
    },

    // Admin Panel
    admin: {
      welcome: '🔐 Admin paneliga xush kelibsiz!',
      notAuthorized: '❌ Siz admin emassiz!',
      mainMenu: '🔐 Admin paneli - Asosiy menyu:',
      statistics: '📊 Statistika:\n\n👥 Jami foydalanuvchilar: {totalUsers}\n🏪 Jami do\'konlar: {totalSellers}\n⏳ Kutilayotgan: {pendingSellers}\n✅ Tasdiqlangan: {approvedSellers}\n❌ Rad etilgan: {rejectedSellers}\n🚫 Bloklangan: {blockedSellers}\n📦 Jami mahsulotlar: {totalProducts}\n📋 Jami buyurtmalar: {totalOrders}\n⭐ Jami baholar: {totalRatings}\n📊 O\'rtacha baho: {averageRating}/5',
      advancedStatistics: '📈 Kengaytirilgan statistika:\n\n💰 Jami tushum: {totalRevenue} so\'m\n📊 O\'rtacha chek: {averageOrderValue} so\'m\n🔥 Top sotuvchilar:\n{topSellers}\n📈 Kunlik faollik:\n{dailyActivity}\n🎯 Konversiya: {conversionRate}%',
      allSellers: '🏪 Barcha do\'konlar ({count}):',
      pendingSellers: '⏳ Kutilayotgan do\'konlar ({count}):',
      approvedSellers: '✅ Tasdiqlangan do\'konlar ({count}):',
      rejectedSellers: '❌ Rad etilgan do\'konlar ({count}):',
      blockedSellers: '🚫 Bloklangan do\'konlar ({count}):',
      sellerDetails: '🏪 Do\'kon ma\'lumotlari:\n\n📝 Nomi: {businessName}\n📍 Turi: {businessType}\n📞 Telefon: {phoneNumber}\n🕐 Ish vaqti: {hours}\n📍 Manzil: {location}\n📅 Ro\'yxatdan o\'tgan: {createdAt}\n📊 Status: {status}\n📦 Mahsulotlar: {productCount} ta\n📋 Buyurtmalar: {orderCount} ta\n⭐ Reyting: {rating}/5',
      sellerNotFound: '❌ Do\'kon topilmadi!',
      actionSuccess: '✅ Amal muvaffaqiyatli bajarildi!',
      actionFailed: '❌ Amal bajarilmadi!',
      confirmationRequired: '⚠️ Amalni tasdiqlash kerak: {action}',
      searchResults: '🔍 Qidiruv natijalari ({count}):',
      noSearchResults: '🔍 Hech narsa topilmadi.',
      broadcastMessage: '📢 Xabar yuborish uchun matnni kiriting:',
      broadcastSent: '✅ Xabar {count} ta foydalanuvchiga yuborildi!',
      broadcastFailed: '❌ Xabar yuborilmadi!',
      contactSeller: '📞 Do\'kon bilan bog\'lanish:\n\n📞 Telefon: {phoneNumber}\n🆔 Telegram ID: {telegramId}',
      sellerProducts: '📦 Do\'kon mahsulotlari ({count}):',
      sellerOrders: '📋 Do\'kon buyurtmalari ({count}):',
      sellerRatings: '⭐ Do\'kon baholari ({count}):',
      noProducts: '📦 Mahsulotlar yo\'q.',
      noOrders: '📋 Buyurtmalar yo\'q.',
      noRatings: '⭐ Baholar yo\'q.',
      productItem: '{number}. 💰 {price} so\'m\n   📝 {description}\n   📅 {date}\n\n',
      orderItem: '{number}. 📋 {code}\n   💰 {price} so\'m\n   👤 {user}\n   📅 {date}\n\n',
      ratingItem: '{number}. ⭐ {rating}/5\n   👤 {user}\n   📅 {date}\n\n',
      // Authentication messages
      loginRequired: '🔐 Admin paneliga kirish uchun avtorizatsiya kerak.',
      enterUsername: '👤 Foydalanuvchi nomini kiriting:',
      enterPassword: '🔒 Parolni kiriting:',
      loginSuccess: '✅ Muvaffaqiyatli kirildi! Admin paneliga xush kelibsiz.',
      loginFailed: '❌ Noto\'g\'ri foydalanuvchi nomi yoki parol.',
      logoutSuccess: '👋 Tizimdan chiqildi.',
      sessionExpired: '⏰ Sessiya muddati tugadi. Qaytadan kirish kerak.'
    }
  },
  
  ru: {
    // Welcome and Language Selection
    welcome: {
      newUser: '👋 Добро пожаловать! Пожалуйста, выберите язык:\n\nWelcome! Please select your language:',
      back: '👋 Добро пожаловать! Главное меню:',
    },
    selectLanguage: '🇺🇿 Tilni tanlang / 🇷🇺 Выберите язык\n\n🇺🇿 O\'zbekcha yoki rus tilini tanlang\n🇷🇺 Выберите узбекский или русский язык',
    languageSelected: '✅ Язык выбран! Теперь выберите вашу роль:',
    
    // Role Selection
    selectRole: '👤 Выберите вашу роль:',
    roleSelected: {
      user: 'Покупатель',
      seller: 'Продавец',
      confirmation: '✅ {role} выбран! Начинаем процесс регистрации...'
    },
    
    // Registration Steps
    registration: {
      phoneRequest: '📱 Пожалуйста, отправьте ваш номер телефона:',
      phoneSuccess: '✅ Номер телефона принят! Теперь выберите способ оплаты:',
      phoneError: '❌ Номер телефона не найден. Пожалуйста, попробуйте снова.',
      storeImageRequest: '📸 Пожалуйста, отправьте фото вашего магазина (необязательно):',
      changePhotoRequest: '📸 Пожалуйста, отправьте новое фото вашего магазина:',
      photoChangedSuccess: '✅ Фото магазина успешно загружено!',
      locationRequest: '📍 Отправьте местоположение:',
      locationSuccess: '✅ Местоположение принято! Теперь выберите способ оплаты:',
      paymentRequest: '💳 Выберите способ оплаты:',
      businessNameRequest: '✅ Номер телефона принят! Теперь введите название вашего бизнеса:',
      businessNameSuccess: '✅ Название бизнеса принято! Теперь выберите тип бизнеса:',
      businessTypeRequest: '✅ Тип бизнеса принят! Теперь отправьте ваше местоположение:',
      priceRequest: '💰 Введите цену товара (например: 50000):',
      priceSuccess: '✅ Цена принята! Введите оригинальную цену (если есть скидка, иначе 0):',
      originalPriceSuccess: '✅ Оригинальная цена принята! Введите краткую информацию о товаре:',
      descriptionSuccess: '✅ Информация принята! Введите время доступности товара (ЧЧ:ММ):',
      availableFromRequest: '🕐 Введите время начала доступности товара (например: 09:00):',
      availableUntilRequest: '🕐 Введите время окончания доступности товара (например: 18:00):',
      availableUntilSuccess: '✅ Время принято! Создание товара...',
      quantityRequest: '🔢 Введите количество товара (например: 10) или пропустите:',
      quantitySuccess: '✅ Количество принято! Создание товара...'
    },
    
    // Validation Messages
    validation: {
      invalidPrice: '❌ Неправильная цена. Пожалуйста, введите положительное число (например: 50000):',
      invalidOriginalPrice: '❌ Неправильная цена. Пожалуйста, введите 0 или положительное число (например: 50000):',
      invalidTime: '❌ Неправильный формат. Пожалуйста, введите в формате ЧЧ:ММ или Ч:ММ (например: 9:00, 22:30):',
      invalidQuantity: '❌ Неправильное количество. Пожалуйста, введите число от 1 до 10000:',
      invalidFormat: '❌ Пожалуйста, отправьте информацию в правильном формате.',
      phoneFormat: 'Номер телефона должен быть в формате Узбекистана (например: +998 90 123 45 67)',
      businessNameFormat: 'Название бизнеса должно содержать только буквы, цифры и пробелы'
    },
    
    // Success Messages
    success: {
      userRegistration: '✅ Регистрация успешно завершена! Нажмите "Найти магазины" для поиска магазинов. Ваше местоположение потребуется только при поиске магазинов.',
      sellerRegistration: '✅ Регистрация успешно завершена! Ожидаем подтверждение администрации. Нажмите /start для перехода в главное меню.',
      productCreated: '✅ Товар успешно добавлен!',
      productDetails: '📦 Информация о товаре:\n\n🔢 Код: {code}\n📝 Описание: {description}\n💰 Цена: {price} сум\n🔢 Количество: {quantity} шт\n⏰ Доступно: {timeRange}',
      orderCreated: '✅ Заказ принят!\n\n📋 Код заказа: {code}\n🔢 Код товара: {productCode}\n💰 Цена: {price} сум\n\nПокажите код заказа продавцу. Способ оплаты обсудите с продавцом.',
      ratingSubmitted: '⭐ Оценка поставлена: {rating}/5',
      productRatingSubmitted: '✅ Спасибо за вашу оценку! Оценка товара: {rating}/5',
      productRatingRequest: '⭐ Оцените товар после получения:',
      storeImageUploaded: '✅ Фото магазина успешно загружено!',
      languageChanged: '✅ Язык успешно изменен!'
    },
    
    // Info Messages
    info: {
      sellerPending: '⏳ Ваш аккаунт еще не подтвержден, но вы можете добавлять товары.'
    },
    
    // Error Messages
    error: {
      general: '❌ Произошла ошибка. Пожалуйста, попробуйте снова.',
      userNotFound: '❌ Сначала зарегистрируйтесь.',
      userAlreadyExists: '❌ Вы уже зарегистрированы.',
      locationNotFound: '❌ Местоположение не найдено. Пожалуйста, отправьте ваше местоположение при поиске магазинов.',
      sellerNotFound: '❌ Вы не продавец.',
      sellerAlreadyExists: '❌ Вы уже зарегистрированы как продавец.',
      sellerNotApproved: '❌ Ваш аккаунт еще не подтвержден.',
      sellersCannotFindStores: '❌ Продавцы не могут искать магазины. Вы сами магазин!',
      productNotFound: '❌ Товар не найден.',
      storeNotFound: '❌ Магазин не найден.',
      noStoresNearby: '😔 Поблизости магазинов не найдено. Попробуйте в другом месте или вернитесь позже.',
      noStoresWithProducts: '😔 Сейчас нет магазинов с доступными товарами. Вернитесь позже.',
      noOrders: '📋 У вас пока нет заказов.',
      noProducts: '📦 У вас пока нет товаров.',
      orderCreationFailed: '❌ Ошибка при создании заказа.',
      productCreationFailed: '❌ Ошибка при добавлении товара.',
      ratingFailed: '❌ Ошибка при выставлении оценки.',
      alreadyRated: '❌ Вы уже оценили этот магазин.',
      productNotSelected: '❌ Товар не выбран.',
      storeNotSelected: '❌ Магазин не выбран.',
      paymentMethodNotSelected: '❌ Способ оплаты не выбран. (Это сообщение больше не показывается)',
      photoProcessingFailed: '❌ Ошибка при обработке фото.',
      productOutOfStock: '❌ Этот товар сейчас недоступен.'
    },
    
    // Main Menu
    mainMenu: {
      welcome: '🎉 Добро пожаловать! Главное меню:',
      findStores: '🏪 Найти магазины',
      myOrders: '📋 Мои заказы',
      postProduct: '📦 Добавить товар',
      myProducts: '📋 Мои товары',
      statistics: '📊 Статистика',
      support: '💬 Поддержка',
      language: '🌐 Изменить язык',
      changePhoto: '📸 Изменить фото магазина'
    },
    
    // Store Discovery
    stores: {
      nearbyStores: '🏪 Ближайшие магазины:\n\n{storeList}',
      storeDetails: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}\n\n{productsList}',
      storeDetailsHeader: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}',
      storeDetailsWithImage: '🏪 {businessName}\n📍 {businessType}\n📞 {phoneNumber}\n🕐 {hours}',
      noProductsAvailable: '😔 В данный момент товары недоступны.',
      availableProducts: '📦 Доступные товары:\n{productsList}',
      requestLocation: '📍 Отправьте ваше текущее местоположение для поиска магазинов:',
      storeItem: '{number}. {businessName}\n📍 {businessType} | {distance}\n\n',
      noProducts: 'Нет товаров',

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
      productItemWithBuy: '🛍️ <b>Товар #{number} | Код: {code}</b>\n{originalPriceText}\n📝 {description}\n⏰ Доступно: {availableUntil}\n🔢 Количество: {quantity} шт\n━━━━━━━━━━━━━━━━━━━━━━━━\n',
      noProducts: '📦 У вас пока нет товаров.',
      productWithDiscount: '{number}. {price} сум ({discount}% скидка)\n',
      productWithoutDiscount: '{number}. {price} сум\n',
      statistics: '📊 Ваша статистика:\n\n📦 Всего товаров: {totalProducts}\n✅ Активные товары: {activeProducts}\n❌ Просроченные: {expiredProducts}\n📋 Всего заказов: {totalOrders}\n💰 Общий доход: {totalRevenue} сум\n⭐ Средняя оценка: {averageRating}/5\n📊 Оценка магазина: {storeRating}/5'
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
      back: '⬅️ Назад',
      backToMainMenu: '🏠 Главное меню',
      tryAgain: '🔄 Попробовать снова',
      skip: '⏭️ Пропустить',
      confirm: '✅ Да',
      cancel: '❌ Нет',
      minus: '➖',
      plus: '➕',
      cancelled: '❌ Отменено'
    },

    // Purchase
    purchase: {
      selectPaymentMethod: '🛒 {productName}\n💰 Цена: {price} сум\n\n💳 Выберите способ оплаты:',
      paymentMethodNotNeeded: '💳 Способ оплаты теперь выбирается автоматически. Заказ создается напрямую.',
      selectQuantity: '🛒 {productName}\n💰 Цена: {price} сум\n🔢 Максимальное количество: {maxQuantity} шт\n\n🔢 Выберите количество:',
      confirmPurchase: '🛒 Подтверждение заказа:\n\n📦 Товар: {productName}\n🔢 Количество: {quantity}\n💰 Общая цена: {totalPrice} сум\n\n✅ Нажмите "Да" для подтверждения\n❌ Нажмите "Нет" для отмены'
    },

    // Admin Panel
    admin: {
      welcome: '🔐 Добро пожаловать в панель администратора!',
      notAuthorized: '❌ Вы не администратор!',
      mainMenu: '🔐 Панель администратора - Главное меню:',
      statistics: '📊 Статистика:\n\n👥 Всего пользователей: {totalUsers}\n🏪 Всего магазинов: {totalSellers}\n⏳ Ожидающие: {pendingSellers}\n✅ Подтвержденные: {approvedSellers}\n❌ Отклоненные: {rejectedSellers}\n🚫 Заблокированные: {blockedSellers}\n📦 Всего товаров: {totalProducts}\n📋 Всего заказов: {totalOrders}\n⭐ Всего оценок: {totalRatings}\n📊 Средняя оценка: {averageRating}/5',
      advancedStatistics: '📈 Расширенная статистика:\n\n💰 Общий доход: {totalRevenue} сум\n📊 Средний чек: {averageOrderValue} сум\n🔥 Топ продавцов:\n{topSellers}\n📈 Активность по дням:\n{dailyActivity}\n🎯 Конверсия: {conversionRate}%',
      allSellers: '🏪 Все магазины ({count}):',
      pendingSellers: '⏳ Ожидающие магазины ({count}):',
      approvedSellers: '✅ Подтвержденные магазины ({count}):',
      rejectedSellers: '❌ Отклоненные магазины ({count}):',
      blockedSellers: '🚫 Заблокированные магазины ({count}):',
      sellerDetails: '🏪 Информация о магазине:\n\n📝 Название: {businessName}\n📍 Тип: {businessType}\n📞 Телефон: {phoneNumber}\n🕐 Время работы: {hours}\n📍 Адрес: {location}\n📅 Зарегистрирован: {createdAt}\n📊 Статус: {status}\n📦 Товары: {productCount} шт\n📋 Заказы: {orderCount} шт\n⭐ Рейтинг: {rating}/5',
      sellerNotFound: '❌ Магазин не найден!',
      actionSuccess: '✅ Действие успешно выполнено!',
      actionFailed: '❌ Действие не выполнено!',
      confirmationRequired: '⚠️ Требуется подтверждение действия: {action}',
      searchResults: '🔍 Результаты поиска ({count}):',
      noSearchResults: '🔍 Ничего не найдено.',
      broadcastMessage: '📢 Введите текст для рассылки:',
      broadcastSent: '✅ Сообщение отправлено {count} пользователям!',
      broadcastFailed: '❌ Сообщение не отправлено!',
      contactSeller: '📞 Связаться с магазином:\n\n📞 Телефон: {phoneNumber}\n🆔 Telegram ID: {telegramId}',
      sellerProducts: '📦 Товары магазина ({count}):',
      sellerOrders: '📋 Заказы магазина ({count}):',
      sellerRatings: '⭐ Оценки магазина ({count}):',
      noProducts: '📦 Нет товаров.',
      noOrders: '📋 Нет заказов.',
      noRatings: '⭐ Нет оценок.',
      productItem: '{number}. 💰 {price} сум\n   📝 {description}\n   📅 {date}\n\n',
      orderItem: '{number}. 📋 {code}\n   💰 {price} сум\n   👤 {user}\n   📅 {date}\n\n',
      ratingItem: '{number}. ⭐ {rating}/5\n   👤 {user}\n   📅 {date}\n\n',
      // Authentication messages
      loginRequired: '🔐 Для входа в панель администратора требуется авторизация.',
      enterUsername: '👤 Введите имя пользователя:',
      enterPassword: '🔒 Введите пароль:',
      loginSuccess: '✅ Успешный вход! Добро пожаловать в панель администратора.',
      loginFailed: '❌ Неправильное имя пользователя или пароль.',
      logoutSuccess: '👋 Вы вышли из системы.',
      sessionExpired: '⏰ Срок сессии истек. Требуется повторный вход.'
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