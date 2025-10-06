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
