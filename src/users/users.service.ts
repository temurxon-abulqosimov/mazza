// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createUser(data: {
    telegramId: string;
    fullName: string;
    phone: string;
    paymentMethod: PaymentMethod;
    language?: 'uz' | 'ru';
  }): Promise<User> {
    const userData = {
      ...data,
      language: data.language || 'uz', // Default to 'uz' if undefined
    };
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { telegramId } });
  }
}