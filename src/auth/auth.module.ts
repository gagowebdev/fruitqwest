import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AppGateway } from '../app.gateway'; // ✅ Импорт WebSocket Gateway
import { UsersModule } from '../users/users.module';
import { GameStoreModule } from '../game-store/game-store.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // ✅ Загружаем .env
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'Gagas2004&&&&', // ✅ Добавляем значение по умолчанию
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => GameStoreModule),
  ],
  providers: [AuthService, JwtAuthGuard, AppGateway],
  controllers: [AuthController],
  exports: [JwtAuthGuard, JwtModule]
})
export class AuthModule {}
