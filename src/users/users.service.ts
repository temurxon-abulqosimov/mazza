// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    console.log('UsersService: Creating user with DTO:', createUserDto);
    
    // Convert DTO to entity-compatible object
    const userData = {
      telegramId: createUserDto.telegramId,
      phoneNumber: createUserDto.phoneNumber,
      paymentMethod: createUserDto.paymentMethod,
      language: createUserDto.language,
      location: createUserDto.location ? {
        latitude: createUserDto.location.latitude,
        longitude: createUserDto.location.longitude
      } : undefined
    };
    
    const user = this.usersRepository.create(userData);
    
    console.log('UsersService: Created user entity:', user);
    
    try {
      const savedUser = await this.usersRepository.save(user);
      console.log('UsersService: User saved successfully:', savedUser);
      return savedUser;
    } catch (error) {
      console.error('UsersService: Error saving user:', error);
      // Check if it's a unique constraint violation
      if (error.code === '23505' && error.constraint && error.constraint.includes('telegramId')) {
        throw new Error('User already exists with this telegram ID');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { telegramId } });
  }

  async update(id: number, updateUserDto: Partial<CreateUserDto>): Promise<User | null> {
    const updateData: any = { ...updateUserDto };
    if (updateUserDto.location) {
      updateData.location = updateUserDto.location;
    } else if (updateUserDto.location === null) {
      updateData.location = null;
    }
    await this.usersRepository.update(id, updateData);
    return this.findOne(id);
  }

  async updateLanguage(telegramId: string, language: 'uz' | 'ru'): Promise<User | null> {
    await this.usersRepository.update({ telegramId }, { language });
    return this.findByTelegramId(telegramId);
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}