export interface NotificationData {
  id: string;
  type: 'order_created' | 'order_confirmed' | 'order_cancelled' | 'order_completed';
  title: string;
  message: string;
  timestamp: string;
  orderId: number;
  orderCode: string;
  productId: number;
  productName: string;
  sellerId?: number;
  userId?: number;
  actionUrl?: string;
  metadata?: {
    productImage?: string;
    totalPrice?: number;
    quantity?: number;
    requiresRating?: boolean;
    sellerName?: string;
  };
}

export interface OrderNotificationPayload {
  order: {
    id: number;
    code: string;
    status: string;
    totalPrice: number;
    quantity: number;
    createdAt: string;
    product: {
      id: number;
      name: string;
      image?: string;
      seller: {
        id: number;
        businessName: string;
      };
    };
    user: {
      id: number;
      telegramId: string;
      firstName?: string;
      lastName?: string;
    };
  };
}
