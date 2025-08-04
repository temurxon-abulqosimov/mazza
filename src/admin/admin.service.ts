import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seller } from '../sellers/entities/seller.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { Admin } from './entities/admin.entity';
import { SellerStatus } from '../common/enums/seller-status.enum';
import { envVariables } from '../config/env.variables';
import { CreateAdminDto, UpdateAdminDto } from './dto/admin-auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Seller)
    private readonly sellersRepository: Repository<Seller>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Rating)
    private readonly ratingsRepository: Repository<Rating>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async initializeAdmin(): Promise<void> {
    console.log('✅ Admin account initialized from environment variables');
  }

  private adminSessions = new Map<string, { lastLogin: Date; isAuthenticated: boolean }>();

  async authenticateAdmin(telegramId: string, username: string, password: string): Promise<Admin | null> {
    console.log('=== ADMIN SERVICE AUTHENTICATION DEBUG ===');
    console.log('Received telegramId:', telegramId);
    console.log('Received username:', username);
    console.log('Received password:', password);
    console.log('Expected telegramId:', envVariables.ADMIN_TELEGRAM_ID);
    console.log('Expected username:', envVariables.ADMIN_USERNAME);
    console.log('Expected password:', envVariables.ADMIN_PASSWORD);
    console.log('TelegramId match:', telegramId === envVariables.ADMIN_TELEGRAM_ID);
    console.log('Username match:', username === envVariables.ADMIN_USERNAME);
    console.log('Password match:', password === envVariables.ADMIN_PASSWORD);
    console.log('Password length:', password.length);
    console.log('Expected password length:', envVariables.ADMIN_PASSWORD.length);
    console.log('Password char codes:', Array.from(password).map(c => c.charCodeAt(0)));
    console.log('Expected password char codes:', Array.from(envVariables.ADMIN_PASSWORD).map(c => c.charCodeAt(0)));
    
    // Check against environment variables
    if (telegramId === envVariables.ADMIN_TELEGRAM_ID && 
        username === envVariables.ADMIN_USERNAME && 
        password === envVariables.ADMIN_PASSWORD) {
      
      // Store session
      this.adminSessions.set(telegramId, {
        lastLogin: new Date(),
        isAuthenticated: true
      });
      
      return {
        id: 1,
        telegramId: envVariables.ADMIN_TELEGRAM_ID,
        username: envVariables.ADMIN_USERNAME,
        password: envVariables.ADMIN_PASSWORD,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as Admin;
    }
    return null;
  }

  async isAdminAuthenticated(telegramId: string): Promise<boolean> {
    const session = this.adminSessions.get(telegramId);
    if (!session) return false;
    
    // Check if session is still valid (24 hours)
    const sessionAge = Date.now() - session.lastLogin.getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxSessionAge) {
      this.adminSessions.delete(telegramId);
      return false;
    }
    
    return session.isAuthenticated;
  }

  async logoutAdmin(telegramId: string): Promise<void> {
    this.adminSessions.delete(telegramId);
  }

  async isAdmin(telegramId: string): Promise<boolean> {
    return telegramId === envVariables.ADMIN_TELEGRAM_ID;
  }

  async getAdminByTelegramId(telegramId: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { telegramId, isActive: true }
    });
  }

  async createAdmin(createAdminDto: CreateAdminDto): Promise<Admin> {
    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);
    
    const admin = this.adminRepository.create({
      ...createAdminDto,
      password: hashedPassword
    });
    
    return this.adminRepository.save(admin);
  }

  async updateAdmin(id: number, updateAdminDto: UpdateAdminDto): Promise<Admin | null> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) return null;

    if (updateAdminDto.password) {
      updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, 10);
    }

    await this.adminRepository.update(id, updateAdminDto);
    return this.adminRepository.findOne({ where: { id } });
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const result = await this.adminRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return this.adminRepository.find({
      select: ['id', 'telegramId', 'username', 'isActive', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' }
    });
  }

  async getStatistics(): Promise<{
    totalUsers: number;
    totalSellers: number;
    pendingSellers: number;
    approvedSellers: number;
    rejectedSellers: number;
    blockedSellers: number;
    totalProducts: number;
    totalOrders: number;
    totalRatings: number;
    averageRating: number;
  }> {
    const [
      totalUsers,
      totalSellers,
      pendingSellers,
      approvedSellers,
      rejectedSellers,
      blockedSellers,
      totalProducts,
      totalOrders,
      totalRatings,
      averageRatingResult
    ] = await Promise.all([
      this.usersRepository.count(),
      this.sellersRepository.count(),
      this.sellersRepository.count({ where: { status: SellerStatus.PENDING } }),
      this.sellersRepository.count({ where: { status: SellerStatus.APPROVED } }),
      this.sellersRepository.count({ where: { status: SellerStatus.REJECTED } }),
      this.sellersRepository.count({ where: { status: SellerStatus.BLOCKED } }),
      this.productsRepository.count(),
      this.ordersRepository.count(),
      this.ratingsRepository.count(),
      this.ratingsRepository
        .createQueryBuilder('rating')
        .select('AVG(rating.rating)', 'average')
        .getRawOne()
    ]);

    return {
      totalUsers,
      totalSellers,
      pendingSellers,
      approvedSellers,
      rejectedSellers,
      blockedSellers,
      totalProducts,
      totalOrders,
      totalRatings,
      averageRating: Math.round((averageRatingResult?.average || 0) * 10) / 10
    };
  }

  async getAllSellers(): Promise<Seller[]> {
    return this.sellersRepository.find({
      relations: ['products'],
      order: { createdAt: 'DESC' }
    });
  }

  async getSellersByStatus(status: SellerStatus): Promise<Seller[]> {
    return this.sellersRepository.find({
      where: { status },
      relations: ['products'],
      order: { createdAt: 'DESC' }
    });
  }

  async getSellerWithDetails(sellerId: number): Promise<Seller | null> {
    return this.sellersRepository.findOne({
      where: { id: sellerId },
      relations: ['products', 'products.orders', 'products.ratings']
    });
  }

  async updateSellerStatus(sellerId: number, status: SellerStatus): Promise<Seller | null> {
    await this.sellersRepository.update(sellerId, { status });
    return this.getSellerWithDetails(sellerId);
  }

  async searchSellers(query: string): Promise<Seller[]> {
    return this.sellersRepository
      .createQueryBuilder('seller')
      .where('seller.businessName ILIKE :query', { query: `%${query}%` })
      .orWhere('seller.phoneNumber ILIKE :query', { query: `%${query}%` })
      .orWhere('seller.businessType ILIKE :query', { query: `%${query}%` })
      .orWhere('seller.telegramId ILIKE :query', { query: `%${query}%` })
      .leftJoinAndSelect('seller.products', 'products')
      .orderBy('seller.createdAt', 'DESC')
      .getMany();
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async getAllProducts(): Promise<Product[]> {
    return this.productsRepository.find({
      relations: ['seller', 'orders', 'ratings'],
      order: { createdAt: 'DESC' }
    });
  }

  async getAllOrders(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['user', 'product', 'product.seller'],
      order: { createdAt: 'DESC' }
    });
  }

  async getAllRatings(): Promise<Rating[]> {
    return this.ratingsRepository.find({
      relations: ['user', 'product', 'product.seller'],
      order: { createdAt: 'DESC' }
    });
  }

  async getSellerProducts(sellerId: number): Promise<Product[]> {
    return this.productsRepository.find({
      where: { seller: { id: sellerId } },
      relations: ['orders', 'ratings'],
      order: { createdAt: 'DESC' }
    });
  }

  async getSellerOrders(sellerId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['user', 'product'],
      where: { product: { seller: { id: sellerId } } },
      order: { createdAt: 'DESC' }
    });
  }

  async getSellerRatings(sellerId: number): Promise<Rating[]> {
    return this.ratingsRepository.find({
      relations: ['user', 'product'],
      where: { product: { seller: { id: sellerId } } },
      order: { createdAt: 'DESC' }
    });
  }

  async deleteSeller(sellerId: number): Promise<boolean> {
    const result = await this.sellersRepository.delete(sellerId);
    return (result.affected || 0) > 0;
  }

  async deleteUser(userId: number): Promise<boolean> {
    const result = await this.usersRepository.delete(userId);
    return (result.affected || 0) > 0;
  }

  async deleteProduct(productId: number): Promise<boolean> {
    const result = await this.productsRepository.delete(productId);
    return (result.affected || 0) > 0;
  }

  async deleteOrder(orderId: number): Promise<boolean> {
    const result = await this.ordersRepository.delete(orderId);
    return (result.affected || 0) > 0;
  }

  async deleteRating(ratingId: number): Promise<boolean> {
    const result = await this.ratingsRepository.delete(ratingId);
    return (result.affected || 0) > 0;
  }
} 