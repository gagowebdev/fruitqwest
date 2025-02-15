import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { ReferralsController } from './referrals.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Transaction } from '../transactions/transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [ReferralsController],
  providers: [JwtAuthGuard], // ✅ Добавляем сюда
})
export class ReferralsModule {}
