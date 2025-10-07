import { Injectable } from '@nestjs/common';

export type Language = 'uz' | 'ru';

interface TranslationKeys {
  [key: string]: string;
}

@Injectable()
export class LocalizationService {
  private translations: Record<Language, TranslationKeys> = {
    uz: {
      // Product creation
      'product.created': 'Mahsulot muvaffaqiyatli yaratildi',
      'product.creation.failed': 'Mahsulot yaratishda xatolik',
      'product.name.required': 'Mahsulot nomi kiritilishi shart',
      'product.name.too.long': 'Mahsulot nomi juda uzun (maksimal 255 belgi)',
      'product.price.required': 'Narx kiritilishi shart',
      'product.price.invalid': 'Narx noto\'g\'ri formatda',
      'product.price.too.high': 'Narx juda yuqori (maksimal 1,000,000,000)',
      'product.quantity.invalid': 'Miqdor noto\'g\'ri formatda',
      'product.quantity.too.high': 'Miqdor juda ko\'p (maksimal 10,000)',
      'product.available.until.required': 'Mavjudlik muddati kiritilishi shart',
      'product.available.until.invalid': 'Mavjudlik muddati noto\'g\'ri formatda',
      'product.description.too.long': 'Tavsif juda uzun (maksimal 1000 belgi)',
      'seller.not.found': 'Sotuvchi topilmadi. Avval ro\'yxatdan o\'ting',
      'user.not.found': 'Foydalanuvchi topilmadi. Avval ro\'yxatdan o\'ting',
      'product.updated': 'Mahsulot yangilandi',
      'product.update.failed': 'Mahsulot yangilashda xatolik',
      'product.deleted': 'Mahsulot o\'chirildi',
      'product.delete.failed': 'Mahsulot o\'chirishda xatolik',
      
      // General
      'success': 'Muvaffaqiyat',
      'error': 'Xatolik',
      'failed': 'Muvaffaqiyatsiz',
      'not.found': 'Topilmadi',
      'unauthorized': 'Ruxsat yo\'q',
      'forbidden': 'Taqiqlangan',
      'bad.request': 'Noto\'g\'ri so\'rov',
      'internal.error': 'Ichki xatolik',
      
      // User/Seller
      'user.created': 'Foydalanuvchi yaratildi',
      'user.updated': 'Foydalanuvchi yangilandi',
      'user.deleted': 'Foydalanuvchi o\'chirildi',
      'seller.created': 'Sotuvchi yaratildi',
      'seller.updated': 'Sotuvchi yangilandi',
      'seller.deleted': 'Sotuvchi o\'chirildi',
      
      // Orders
      'order.created': 'Buyurtma yaratildi',
      'order.updated': 'Buyurtma yangilandi',
      'order.cancelled': 'Buyurtma bekor qilindi',
      'order.completed': 'Buyurtma yakunlandi',
    },
    ru: {
      // Product creation
      'product.created': 'Товар успешно создан',
      'product.creation.failed': 'Ошибка создания товара',
      'product.name.required': 'Название товара обязательно',
      'product.name.too.long': 'Название товара слишком длинное (максимум 255 символов)',
      'product.price.required': 'Цена обязательна',
      'product.price.invalid': 'Неверный формат цены',
      'product.price.too.high': 'Цена слишком высокая (максимум 1,000,000,000)',
      'product.quantity.invalid': 'Неверный формат количества',
      'product.quantity.too.high': 'Количество слишком большое (максимум 10,000)',
      'product.available.until.required': 'Срок действия обязателен',
      'product.available.until.invalid': 'Неверный формат срока действия',
      'product.description.too.long': 'Описание слишком длинное (максимум 1000 символов)',
      'seller.not.found': 'Продавец не найден. Пожалуйста, зарегистрируйтесь',
      'user.not.found': 'Пользователь не найден. Пожалуйста, зарегистрируйтесь',
      'product.updated': 'Товар обновлен',
      'product.update.failed': 'Ошибка обновления товара',
      'product.deleted': 'Товар удален',
      'product.delete.failed': 'Ошибка удаления товара',
      
      // General
      'success': 'Успех',
      'error': 'Ошибка',
      'failed': 'Неудача',
      'not.found': 'Не найдено',
      'unauthorized': 'Не авторизован',
      'forbidden': 'Запрещено',
      'bad.request': 'Неверный запрос',
      'internal.error': 'Внутренняя ошибка',
      
      // User/Seller
      'user.created': 'Пользователь создан',
      'user.updated': 'Пользователь обновлен',
      'user.deleted': 'Пользователь удален',
      'seller.created': 'Продавец создан',
      'seller.updated': 'Продавец обновлен',
      'seller.deleted': 'Продавец удален',
      
      // Orders
      'order.created': 'Заказ создан',
      'order.updated': 'Заказ обновлен',
      'order.cancelled': 'Заказ отменен',
      'order.completed': 'Заказ завершен',
    }
  };

  translate(key: string, language: Language = 'uz'): string {
    return this.translations[language][key] || key;
  }

  getLanguageFromRequest(req: any): Language {
    // Try to get language from various sources
    const language = req.headers['x-language'] || 
                    req.headers['accept-language'] || 
                    req.user?.language || 
                    'uz';
    
    return (language === 'ru' || language === 'uz') ? language : 'uz';
  }
}
