// src/products/entities/product.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Rating } from 'src/ratings/entities/rating.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('float')
  price: number;

  @Column('float', { nullable: true })
  originalPrice?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'enum', enum: ['bread_bakery', 'pastry', 'main_dishes', 'desserts', 'beverages', 'other'], default: 'other' })
  category: string;

  @Column({ type: 'enum', enum: ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'none'], default: 'none' })
  dietaryInfo: string;

  @Column({ type: 'timestamp', nullable: true })
  availableFrom?: Date;

  @Column({ type: 'timestamp' })
  availableUntil: Date;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  soldQuantity: number;

  @Column({ type: 'float', default: 0 })
  discountPercentage: number;

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