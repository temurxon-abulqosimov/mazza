// src/sellers/entities/seller.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { Rating } from 'src/ratings/entities/rating.entity';
import { BusinessType } from 'src/common/enums/business-type.enum';
import { SellerStatus } from 'src/common/enums/seller-status.enum';

@Entity()
export class Seller {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramId: string;

  @Column()
  phoneNumber: string;

  @Column()
  businessName: string;

  @Column({ type: 'enum', enum: BusinessType })
  businessType: BusinessType;

  @Column('jsonb', { nullable: true })
  location?: { latitude: number; longitude: number } | null;

  @Column({ type: 'int' })
  opensAt: number; // Minutes from midnight

  @Column({ type: 'int' })
  closesAt: number; // Minutes from midnight

  @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.PENDING })
  status: SellerStatus;

  @Column({ type: 'enum', enum: ['uz', 'ru'], default: 'uz' })
  language: 'uz' | 'ru';

  @Column({ nullable: true })
  imageUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.seller)
  products: Product[];

  // Ratings are now calculated from product ratings
  // No direct relationship needed
}