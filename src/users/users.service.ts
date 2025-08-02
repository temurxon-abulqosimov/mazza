// src/users/users.service.ts
import { Injectable } from '@nestjs/common';

export interface User {
  fullName: string;
  phone: string;
  paymentMethod: string;
}

@Injectable()
export class UsersService {
  private users: User[] = []; // Mock storage; replace with database in production

  async createUser(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }
}