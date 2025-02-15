import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transactions.entity';
import { TransactionsController } from './transactions.controller';
import { User } from 'src/users/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AppGateway } from '../app.gateway';
import { UsersModule } from '../users/users.module'; // ✅ Импортируем UsersModule
import { GameStoreModule } from '../game-store/game-store.module'; // ✅ Добавляем


@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback_secret',
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => GameStoreModule),
  ],
  controllers: [TransactionsController],
  providers: [JwtAuthGuard, AppGateway], // ✅ Добавляем сюда
})
export class TransactionsModule {}
