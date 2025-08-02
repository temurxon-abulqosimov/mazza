// src/products/entities/product.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Booking } from 'src/bookings/entities/booking.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('float')
  price: number;

  @Column('float', { nullable: true })
  discountPrice?: number;

  @ManyToOne(() => Seller, (seller) => seller.products)
  seller: Seller;

  @OneToMany(() => Booking, (booking) => booking.product)
  bookings: Booking[];
}