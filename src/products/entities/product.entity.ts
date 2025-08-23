// src/products/entities/product.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
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

  @Column({ type: 'varchar', length: 5, nullable: true })
  availableFrom?: string; // Format: "HH:MM"

  @Column({ type: 'timestamp' })
  availableUntil: Date;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Seller, (seller) => seller.products)
  @JoinColumn({ name: 'sellerId' })
  seller: Seller;

  @OneToMany(() => Order, (order) => order.product)
  orders: Order[];

  @OneToMany(() => Rating, (rating) => rating.product)
  ratings: Rating[];
}