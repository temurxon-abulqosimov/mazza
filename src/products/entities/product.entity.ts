import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Seller } from 'src/sellers/entities/seller.entity';
  
  @Entity()
  export class Product {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    name: string;
  
    @Column('float')
    price: number;
  
    @Column()
    description: string;
  
    @Column()
    availableUntil: Date;
  
    @ManyToOne(() => Seller, (seller) => seller.products)
    seller: Seller;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }
  