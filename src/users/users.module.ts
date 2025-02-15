import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./users.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuthModule } from "../auth/auth.module"; // ✅ Импортируем AuthModule
import { AppModule } from '../app.module';
import { UserPurchase } from '../game-store/entities/user-purchase.entity'; // ✅ Импортируем
import { AppGateway } from '../app.gateway';
import { StoreItem } from "../game-store/entities/store-item.entity"; // ✅ Импортируем StoreItem
import { GameStoreModule } from '../game-store/game-store.module';
import { Transaction } from 'src/transactions/transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StoreItem, UserPurchase, Transaction]),
    forwardRef(() => AuthModule),
    forwardRef(() => AppModule),
    forwardRef(() => GameStoreModule)
  ],
  controllers: [UsersController],
  providers: [UsersService, AppGateway], // ✅ Добавляем AppGateway через forwardRef
  exports: [UsersService], // ✅ Экспортируем AppGateway
})
export class UsersModule {}
