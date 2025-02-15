import { Module, forwardRef  } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStoreService } from './game-store.service';
import { GameStoreController } from './game-store.controller';
import { StoreItem } from './entities/store-item.entity';
import { UserPurchase } from './entities/user-purchase.entity';
import { UsersModule } from '../users/users.module';
import { AppGateway } from '../app.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreItem, UserPurchase]),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [GameStoreController],
  providers: [GameStoreService, AppGateway],
  exports: [GameStoreService, AppGateway],
})
export class GameStoreModule {}
