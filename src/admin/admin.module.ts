import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // ✅ Добавляем TypeOrmModule
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AuthModule } from '../auth/auth.module'; // ✅ Добавляем импорт AuthModule
import { GameStoreModule } from '../game-store/game-store.module';
import { User } from '../users/users.entity';
import { Transaction } from '../transactions/transactions.entity'; // ✅ Импортируем Transaction
import { UserPurchase } from '../game-store/entities/user-purchase.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction, UserPurchase]),
    forwardRef(() => UsersModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => GameStoreModule),
    forwardRef(() => AuthModule), // ✅ Добавляем сюда
  ],
  controllers: [AdminController],
})
export class AdminModule {}
