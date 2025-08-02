// src/bookings/entities/booking.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: () => `'${uuidv4()}'` })
  code: string;

  @ManyToOne(() => User, (user) => user.bookings)
  user: User;

  @ManyToOne(() => Product, (product) => product.bookings)
  product: Product;
}