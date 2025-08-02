// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { Booking } from 'src/bookings/entities/booking.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramId: string;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: ['uz', 'ru'], default: 'uz' })
  language: 'uz' | 'ru';

  @OneToMany(() => Booking, (booking) => booking.user)
  bookings: Booking[];
}