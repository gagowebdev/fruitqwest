import { 
    Controller, Patch, Delete, Query, Get, Body, UseGuards, Param, Request, NotFoundException, BadRequestException 
  } from '@nestjs/common';
  import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
  import { RoleGuard } from '../auth/role.guard';
  import { Roles } from '../auth/roles.decorator';
  import { UserRole } from '../users/users.entity';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, MoreThan } from 'typeorm';
  import { Transaction, TransactionType, TransactionStatus, TransactionMethod } from '../transactions/transactions.entity';
  import { UsersService } from '../users/users.service';
  import { UpdateUserDto } from '../users/dto/update-user.dto';
  import { AppGateway } from '../app.gateway';
  import { User } from '../users/users.entity';
  import { UserPurchase } from '../game-store/entities/user-purchase.entity';
  
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN) // ✅ Только админы могут использовать этот контроллер
  @Controller('admin')
  export class AdminController {
    constructor(
      private readonly usersService: UsersService,
      private readonly appGateway: AppGateway,
      @InjectRepository(Transaction)
      private readonly transactionsRepository: Repository<Transaction>,
      @InjectRepository(User) private readonly usersRepository: Repository<User>,
      @InjectRepository(UserPurchase)
      private readonly userPurchaseRepository: Repository<UserPurchase>, // ✅ Добавляем сюда
    ) {}

    @Get() // ✅ Обрабатываем GET-запрос
    getAdminDashboard() {
        return { message: 'Добро пожаловать в админку!' };
    }

    @Get('transactions')
    async getTransactions(@Query() query: { userId?: number; status?: TransactionStatus; minAmount?: number }) {
    const where: any = {};

    if (query.userId) where.user = { id: query.userId };
    if (query.status) where.status = query.status;
    if (query.minAmount) where.amount = MoreThan(query.minAmount);

    const transactions = await this.transactionsRepository.find({ where, relations: ['user'] });
    return { transactions };
    }

    @Patch('transactions/:id/confirm')
    async confirmTransaction(@Param('id') id: number) {
        const transaction = await this.transactionsRepository.findOne({
            where: { id, status: TransactionStatus.CREATED }, // ✅ Разрешаем только для CREATED
        });

        if (!transaction) {
            throw new NotFoundException('Транзакция не найдена или уже обработана');
        }

        transaction.status = TransactionStatus.PENDING; // ✅ Меняем CREATED → PENDING
        await this.transactionsRepository.save(transaction);

        return { message: 'Транзакция помечена как "Ожидание проверки администратора"', status: transaction.status };
    }


    // ✅ Клиент нажал "Отмена"
    @Delete('transactions/:id/cancel')
    async cancelTransaction(@Param('id') id: number) {
        const transaction = await this.transactionsRepository.findOne({
            where: { id, status: TransactionStatus.PENDING },
        });

        if (!transaction) {
            throw new NotFoundException('Транзакция не найдена или уже обработана');
        }

        await this.transactionsRepository.remove(transaction);

        return { message: 'Транзакция успешно отменена' };
    }
  
    // ✅ Одобрить транзакцию (депозит/вывод)
    @Patch('transactions/:id/approve')
    async approveTransaction(@Param('id') id: number) {
      const transaction = await this.transactionsRepository.findOne({
        where: { id, status: TransactionStatus.PENDING },
        relations: ['user'],
      });
  
      if (!transaction) {
        throw new NotFoundException('Транзакция не найдена или уже обработана');
      }
  
      const user = transaction.user;
      if (!user) {
        throw new BadRequestException('Пользователь не найден');
      }
  
      if (transaction.type === TransactionType.DEPOSIT) {
        // ✅ Начисляем депозит
        user.balance = Number(user.balance) + Number(transaction.amount);
        await this.usersService.save(user);
  
        // ✅ Уведомляем пользователя
        this.appGateway.sendBalanceUpdate(user.id, user.balance);
      }
  
      transaction.status = TransactionStatus.APPROVED;
      await this.transactionsRepository.save(transaction);
  
      // ✅ Отправляем обновление статуса транзакции
      this.appGateway.sendTransactionUpdate(user.id, transaction.id, transaction.status);
  
      return { message: 'Транзакция подтверждена', status: transaction.status };
    }
  
    // ✅ Отклонить транзакцию (депозит/вывод)
    @Patch('transactions/:id/reject')
    async rejectTransaction(@Param('id') id: number) {
      const transaction = await this.transactionsRepository.findOne({
        where: { id, status: TransactionStatus.PENDING },
        relations: ['user'],
      });
  
      if (!transaction) {
        throw new NotFoundException('Транзакция не найдена или уже обработана');
      }
  
      const user = transaction.user;
      if (!user) {
        throw new BadRequestException('Пользователь не найден');
      }
  
      if (transaction.type === TransactionType.WITHDRAWAL) {
        // ✅ Возвращаем деньги при отклонении вывода
        user.balance = Number(user.balance) + Number(transaction.amount);
        await this.usersService.save(user);
  
        // ✅ Уведомляем пользователя
        this.appGateway.sendBalanceUpdate(user.id, user.balance);
      }
  
      transaction.status = TransactionStatus.REJECTED;
      await this.transactionsRepository.save(transaction);
  
      // ✅ Отправляем обновление статуса транзакции
      this.appGateway.sendTransactionUpdate(user.id, transaction.id, transaction.status);
  
      return { message: 'Транзакция отклонена', status: transaction.status };
    }

    @Get('users')
    async getUsers(@Query() query: { login?: string; role?: UserRole; minBalance?: number }) {
      const where: any = {};
    
      if (query.login) where.login = query.login;
      if (query.role) where.role = query.role;
      if (query.minBalance) where.balance = MoreThan(query.minBalance);
    
      const users = await this.usersRepository.find({ where });
      return { users };
    }

    @Patch('users/:id')
    async updateUser(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
        const user = await this.usersRepository.findOne({ where: { id } });

        if (!user) {
        throw new NotFoundException('Пользователь не найден');
        }

        // ✅ Запрещаем менять ID пользователя
        delete (updateUserDto as any).id;

        // ✅ Проверяем уникальность логина (если он передан)
        if (updateUserDto.login) {
            const existingUser = await this.usersService.findByLogin(updateUserDto.login, user.id);
        if (existingUser && existingUser.id !== user.id) {
            throw new BadRequestException('Этот логин уже занят');
        }
        }

        // ✅ Обновляем пользователя
        await this.usersRepository.update(id, updateUserDto);

        // ✅ Отправляем WebSocket-обновление
        this.appGateway.sendUserUpdate(user.id, { login: updateUserDto.login ?? user.login, role: updateUserDto.role ?? user.role });

        return { message: 'Данные пользователя обновлены' };
    }


    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(UserRole.ADMIN)
    @Get('stats')
    async getAdminStats() {
    // 💸 Сумма всех одобренных депозитов
    const totalApprovedDeposits = await this.transactionsRepository
        .createQueryBuilder('transaction')
        .where('transaction.type = :type', { type: TransactionType.DEPOSIT })
        .andWhere('transaction.status = :status', { status: TransactionStatus.APPROVED })
        .select('SUM(transaction.amount)', 'total')
        .getRawOne();

    // 🏦 Сумма всех одобренных выводов
    const totalApprovedWithdrawals = await this.transactionsRepository
        .createQueryBuilder('transaction')
        .where('transaction.type = :type', { type: TransactionType.WITHDRAWAL })
        .andWhere('transaction.status = :status', { status: TransactionStatus.APPROVED })
        .select('SUM(transaction.amount)', 'total')
        .getRawOne();

    // 💰 Общий реальный баланс всех пользователей
    const totalUserBalance = await this.usersRepository
        .createQueryBuilder('user')
        .select('SUM(user.balance)', 'total')
        .getRawOne();

    // 🕒 Количество ожидающих депозитов/выводов (PENDING)
    const pendingTransactions = await this.transactionsRepository.count({
        where: { status: TransactionStatus.PENDING },
    });

    // 🛒 Сколько было покупок в игровом магазине
    const totalStorePurchases = await this.userPurchaseRepository.count();

    // 💲 На какую сумму были покупки в магазине
    const totalSpentInStore = await this.userPurchaseRepository
        .createQueryBuilder('purchase')
        .leftJoin('purchase.item', 'item')
        .select('SUM(item.price)', 'total')
        .getRawOne();

    // 👥 Сколько пользователей с рефералами, которые купили пакет
    const usersWithReferralsAndPackage = await this.usersRepository
        .createQueryBuilder('user')
        .where('user.referrer_id IS NOT NULL')
        .andWhere('user.package_id IS NOT NULL')
        .getCount();

    // 📈 Топ 10 пользователей по реферальному доходу
    const topReferrers = await this.transactionsRepository
    .createQueryBuilder('transaction')
    .leftJoinAndSelect('transaction.user', 'user') // ✅ Правильная связь с `user`
    .select('user.id', 'userId') // ✅ Используем `user.id`
    .addSelect('SUM(transaction.amount)', 'totalEarnings')
    .where('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
    .groupBy('user.id') // ✅ Группируем по `user.id`
    .orderBy('totalEarnings', 'DESC')
    .limit(10)
    .getRawMany();


    return {
        totalApprovedDeposits: parseFloat(totalApprovedDeposits.total) || 0,
        totalApprovedWithdrawals: parseFloat(totalApprovedWithdrawals.total) || 0,
        totalUserBalance: parseFloat(totalUserBalance.total) || 0,
        pendingTransactions,
        totalStorePurchases,
        totalSpentInStore: parseFloat(totalSpentInStore.total) || 0,
        usersWithReferralsAndPackage,
        topReferrers,
    };
    }


  }
  