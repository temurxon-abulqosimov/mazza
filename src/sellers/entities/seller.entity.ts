// src/sellers/entities/seller.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
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

  @Column({ type: 'point', nullable: true, transformer: {
    to: (value: { latitude: number; longitude: number } | undefined) => {
      if (!value || !value.latitude || !value.longitude) {
        return null;
      }
      return `(${value.longitude},${value.latitude})`;
    },
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
  location?: { latitude: number; longitude: number };

  @Column({ type: 'int' })
  opensAt: number; // Minutes from midnight

  @Column({ type: 'int' })
  closesAt: number; // Minutes from midnight

  @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.PENDING })
  status: SellerStatus;

  @Column({ type: 'enum', enum: ['uz', 'ru'], default: 'uz' })
  language: 'uz' | 'ru';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Product, (product) => product.seller)
  products: Product[];
}