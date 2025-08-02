// src/sellers/entities/seller.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { BusinessType } from 'src/common/enums/business-type.enum';



@Entity()
export class Seller {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  telegramId: string;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column({ type: 'enum', enum: BusinessType })
  businessType: BusinessType;

  @Column({ type: 'point' })
  location: { type: string; coordinates: number[] };

  @OneToMany(() => Product, (product) => product.seller)
  products: Product[];
}