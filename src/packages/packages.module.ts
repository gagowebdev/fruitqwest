import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './packages.entity';
import { PackagesController } from './packages.controller';
import { User } from 'src/users/users.entity';
import { Transaction } from 'src/transactions/transactions.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, User, Transaction]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'Gagas2004&&&&',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [PackagesController],
  providers: [JwtAuthGuard], // ✅ Добавляем сюда
})
export class PackagesModule {}
