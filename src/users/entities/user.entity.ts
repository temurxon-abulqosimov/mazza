// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { Order } from 'src/orders/entities/order.entity';
import { Rating } from 'src/ratings/entities/rating.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramId: string;

  @Column()
  phoneNumber: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: ['uz', 'ru'], default: 'uz' })
  language: 'uz' | 'ru';

  @Column({ type: 'point', transformer: {
    to: (value: { latitude: number; longitude: number }) => `(${value.longitude},${value.latitude})`,
    from: (value: any) => {
      if (!value) return null;
      
      // If it's already an object with latitude/longitude, return it
      if (typeof value === 'object' && value.latitude && value.longitude) {
        return value;
      }
      
      // If it's a string, try to parse it
      if (typeof value === 'string') {
        const match = value.match(/\(([^,]+),([^)]+)\)/);
        if (match) {
          return {
            latitude: parseFloat(match[2]),
            longitude: parseFloat(match[1])
          };
        }
      }
      
      // If it's an array [longitude, latitude], convert it
      if (Array.isArray(value) && value.length === 2) {
        return {
          longitude: parseFloat(value[0]),
          latitude: parseFloat(value[1])
        };
      }
      
      return null;
    }
  }})
  location: { latitude: number; longitude: number };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Rating, (rating) => rating.user)
  ratings: Rating[];
}