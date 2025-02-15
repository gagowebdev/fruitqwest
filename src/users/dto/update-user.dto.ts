import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../users.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}