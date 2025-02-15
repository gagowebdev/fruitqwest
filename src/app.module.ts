import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './users/users.entity';
import { Package } from './packages/packages.entity';
import { PackagesModule } from './packages/packages.module';
import { Transaction } from './transactions/transactions.entity';
import { TransactionsModule } from './transactions/transactions.module';
import { AuthModule } from './auth/auth.module';
import { ReferralsModule } from './referrals/referrals.module';
import { UsersModule } from "./users/users.module";
import { AppGateway } from './app.gateway'; // Импорт WebSocket-шлюза
import { StoreItem } from './game-store/entities/store-item.entity';
import { GameStoreModule } from './game-store/game-store.module';
import { AdminModule } from './admin/admin.module';
console.log('🔗 Подключение к базе данных:');
console.log('🌍 HOST:', process.env.DB_HOST);
console.log('📡 PORT:', process.env.DB_PORT);
console.log('👤 USER:', process.env.DB_USER);
console.log('🔑 PASSWORD:', process.env.DB_PASSWORD ? '✅ Установлен' : '❌ НЕ установлен');
console.log('🗄 DATABASE:', process.env.DB_NAME);

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      entities: [User, Package, Transaction],
      synchronize: true,
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => GameStoreModule),
    TypeOrmModule.forFeature([StoreItem]),
    ReferralsModule,
    AdminModule,
    PackagesModule,
    TransactionsModule,
    UsersModule,
  ],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class AppModule {}
