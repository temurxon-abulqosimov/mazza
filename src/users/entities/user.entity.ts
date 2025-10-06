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

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ type: 'enum', enum: ['uz', 'ru'], default: 'uz' })
  language: 'uz' | 'ru';

  @Column({ type: 'enum', enum: ['USER', 'SELLER', 'ADMIN'], default: 'USER' })
  role: 'USER' | 'SELLER' | 'ADMIN';

  @Column('jsonb', { nullable: true })
  location?: { latitude: number; longitude: number } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Rating, (rating) => rating.user)
  ratings: Rating[];
}