import { Controller, Get, Patch, UseGuards, Request, Body, Param, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./users.entity";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ChangePasswordDto } from "./dto/change-password.dto"; // ДТО для изменения пароля
import { AppGateway } from '../app.gateway'; // ✅ Импорт WebSocket
import { Transaction, TransactionType } from 'src/transactions/transactions.entity';

// import { UpdateUserDto } from './dto/update-user.dto';
// import { Roles } from 'src/auth/roles.decorator';
// import { RoleGuard } from 'src/auth/role.guard';
// import { UserRole } from 'src/users/users.entity';

@Controller("users")
export class UsersController {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly appGateway: AppGateway, // ✅ Добавляем WebSocket в конструктор
    @InjectRepository(Transaction) private transactionsRepository: Repository<Transaction>,
  ) {}

   // Эндпоинт для смены пароля
  @UseGuards(JwtAuthGuard) // Защищаем маршрут
  @Patch("change-password")
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user.userId;
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@Request() req) {
    const userId = req.user.userId;
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["package"],
    });
  
    if (!user) return { message: "Пользователь не найден" };
  
    const baseLimit = user.package?.earnings_limit ?? 0;
    const bonusLimit = Number(user.personalEarningsLimit) || 0;
    const totalLimit = baseLimit + bonusLimit;
  
    const totalEarned = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .where('transaction.user = :userId', { userId: user.id })
      .andWhere('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
      .select('SUM(transaction.amount)', 'total')
      .getRawOne();
  
    const earnedAmount = Number(totalEarned.total) || 0;
    const remainingLimit = Math.max(totalLimit - earnedAmount, 0);
  
    return {
      id: user.id,
      login: user.login,
      balance: user.balance,
      referrerId: user.referrer_id,
      package: user.package ? { id: user.package.id, name: user.package.name } : null,
      gameBalance: user.gameBalance,
      skinId: user.skinId,
      level: user.level, // ✅ Добавили уровень
      clicks: user.clicks, // ✅ Добавили клики для уровня
      referralLimit: {
        totalLimit,
        used: earnedAmount,
        remaining: remainingLimit,
      }
    };
  }
  


}
