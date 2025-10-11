import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from '../../webapp/gateways/realtime.gateway';
import { NotificationData, OrderNotificationPayload } from '../types/notification.types';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable()
export class NotificationService {
  constructor(private realtimeGateway: RealtimeGateway) {}

  /**
   * Send notification when a new order is created
   */
  async notifyOrderCreated(orderPayload: OrderNotificationPayload): Promise<void> {
    const { order } = orderPayload;
    
    const notification: NotificationData = {
      id: `order_created_${order.id}_${Date.now()}`,
      type: 'order_created',
      title: 'New Order Received! 🛒',
      message: `You have a new order for "${order.product.name}" from ${order.user.firstName || 'Customer'}`,
      timestamp: new Date().toISOString(),
      orderId: order.id,
      orderCode: order.code,
      productId: order.product.id,
      productName: order.product.name,
      sellerId: order.product.seller.id,
      userId: order.user.id,
      actionUrl: `/orders/${order.id}`,
      metadata: {
        productImage: order.product.image,
        totalPrice: order.totalPrice,
        quantity: order.quantity,
      },
    };

    // Send to seller
    this.realtimeGateway.emitToSeller(order.product.seller.id, 'notification', notification);
    
    // Also send order data for real-time updates
    this.realtimeGateway.emitToSeller(order.product.seller.id, 'orderCreated', order);
  }

  /**
   * Send notification when order status changes
   */
  async notifyOrderStatusChanged(
    orderPayload: OrderNotificationPayload, 
    oldStatus: OrderStatus, 
    newStatus: OrderStatus
  ): Promise<void> {
    const { order } = orderPayload;
    
    let notification: NotificationData;
    
    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        notification = {
          id: `order_confirmed_${order.id}_${Date.now()}`,
          type: 'order_confirmed',
          title: 'Order Confirmed! ✅',
          message: `Your order for "${order.product.name}" has been confirmed by ${order.product.seller.businessName}. Please rate your experience!`,
          timestamp: new Date().toISOString(),
          orderId: order.id,
          orderCode: order.code,
          productId: order.product.id,
          productName: order.product.name,
          sellerId: order.product.seller.id,
          userId: order.user.id,
          actionUrl: `/orders/${order.id}/rate`,
          metadata: {
            productImage: order.product.image,
            totalPrice: order.totalPrice,
            quantity: order.quantity,
            requiresRating: true,
            sellerName: order.product.seller.businessName,
          },
        };
        break;
        
      case OrderStatus.CANCELLED:
        notification = {
          id: `order_cancelled_${order.id}_${Date.now()}`,
          type: 'order_cancelled',
          title: 'Order Cancelled ❌',
          message: `Your order for "${order.product.name}" has been cancelled`,
          timestamp: new Date().toISOString(),
          orderId: order.id,
          orderCode: order.code,
          productId: order.product.id,
          productName: order.product.name,
          sellerId: order.product.seller.id,
          userId: order.user.id,
          actionUrl: `/orders/${order.id}`,
          metadata: {
            productImage: order.product.image,
            totalPrice: order.totalPrice,
            quantity: order.quantity,
          },
        };
        break;
        
      case OrderStatus.COMPLETED:
        notification = {
          id: `order_completed_${order.id}_${Date.now()}`,
          type: 'order_completed',
          title: 'Order Completed! 🎉',
          message: `Your order for "${order.product.name}" has been completed`,
          timestamp: new Date().toISOString(),
          orderId: order.id,
          orderCode: order.code,
          productId: order.product.id,
          productName: order.product.name,
          sellerId: order.product.seller.id,
          userId: order.user.id,
          actionUrl: `/orders/${order.id}`,
          metadata: {
            productImage: order.product.image,
            totalPrice: order.totalPrice,
            quantity: order.quantity,
          },
        };
        break;
        
      default:
        return; // No notification for other status changes
    }

    // Send to user
    this.realtimeGateway.emitToUser(order.user.id, 'notification', notification);
    
    // Also send order data for real-time updates
    this.realtimeGateway.emitToUser(order.user.id, 'orderStatusChanged', order);
    this.realtimeGateway.emitToSeller(order.product.seller.id, 'orderStatusChanged', order);
  }

  /**
   * Send custom notification
   */
  async sendNotification(
    targetType: 'user' | 'seller',
    targetId: number,
    notification: NotificationData
  ): Promise<void> {
    if (targetType === 'user') {
      this.realtimeGateway.emitToUser(targetId, 'notification', notification);
    } else {
      this.realtimeGateway.emitToSeller(targetId, 'notification', notification);
    }
  }
}
