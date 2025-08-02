import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { PaymentMethod } from 'src/common/enums/payment-method.enum';
  import { Booking } from 'src/bookings/entities/booking.entity';
  
  @Entity()
  export class User {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    fullName: string;
  
    @Column({ unique: true })
    phoneNumber: string;
  
    @Column()
    telegramId: string;
  
    @Column('float')
    latitude: number;
  
    @Column('float')
    longitude: number;
  
    @Column({ type: 'enum', enum: PaymentMethod })
    paymentMethod: PaymentMethod;
  
    @Column({ default: 'uz' })
    language: string;
  
    @OneToMany(() => Booking, (booking) => booking.user)
    bookings: Booking[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }
  