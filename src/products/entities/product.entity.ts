// src/products/entities/product.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Rating } from 'src/ratings/entities/rating.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('float')
  price: number;

  @Column('float', { nullable: true })
  originalPrice?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  availableUntil: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Seller, (seller) => seller.products)
  seller: Seller;

  @OneToMany(() => Order, (order) => order.product)
  orders: Order[];

  @OneToMany(() => Rating, (rating) => rating.product)
  ratings: Rating[];
}