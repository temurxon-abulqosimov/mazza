import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { BusinessType } from 'src/common/enums/business-type.enum';
  import { SellerStatus } from 'src/common/enums/seller-status.enum';
  import { Product } from 'src/products/entities/product.entity';
  import { Booking } from 'src/bookings/entities/booking.entity';
  
  @Entity()
  export class Seller {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    fullName: string;
  
    @Column({ unique: true })
    phoneNumber: string;
  
    @Column({ unique: true })
    telegramId: string;
  
    @Column()
    businessName: string;
  
    @Column({ type: 'enum', enum: BusinessType })
    businessType: BusinessType;
  
    @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.PENDING })
    status: SellerStatus;
  
    @Column('float')
    latitude: number;
  
    @Column('float')
    longitude: number;
  
    @Column() // Minutes after midnight
    opensAt: number;
  
    @Column()
    closesAt: number;
  
    @OneToMany(() => Product, (product) => product.seller)
    products: Product[];
  
    @OneToMany(() => Booking, (booking) => booking.seller)
    bookings: Booking[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }
  