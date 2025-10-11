import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationService } from 'src/common/services/notification.service';
import { RealtimeGateway } from 'src/webapp/gateways/realtime.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User])],
  providers: [OrdersService, NotificationService, RealtimeGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
