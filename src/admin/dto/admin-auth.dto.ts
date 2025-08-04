export class AdminLoginDto {
  username: string;
  password: string;
}

export class CreateAdminDto {
  telegramId: string;
  username: string;
  password: string;
}

export class UpdateAdminDto {
  username?: string;
  password?: string;
  isActive?: boolean;
} 