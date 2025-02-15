import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/users.entity';

export const Roles = (role: UserRole) => SetMetadata('role', role);
