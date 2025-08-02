import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Seller } from 'src/sellers/entities/seller.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity()
export class Booking {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true})
    code: string;

    @ManyToOne(() => User, (user) => user.bookings)
    user: User;

    @ManyToOne(() => Seller, (seller) => seller.bookings)
    seller: Seller;

    @ManyToOne(() => Product)
    product: Product;

    @Column({ default: false })
    isConfirmedBySeller: boolean;

    @CreateDateColumn()
    bookedAt: Date;

    @Column({ nullable: true })
    expiresAt?: Date;

    @Column({ default: false })
    isCancelled: boolean;

}
