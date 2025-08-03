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
    const user = this.usersRepository.create({
      ...createUserDto,
      location: createUserDto.location,
    });
    return this.usersRepository.save(user);
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