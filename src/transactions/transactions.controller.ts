import { Controller, Post, Body, Request, Get, Query, UseGuards, BadRequestException, Patch, NotFoundException, Param, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus, TransactionMethod } from './transactions.entity';
import { User } from 'src/users/users.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import axios from 'axios';

@Controller('transactions')
export class TransactionsController {
  constructor(
    @InjectRepository(Transaction) private transactionsRepository: Repository<Transaction>,
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  private async getTonRate(): Promise<number | null> {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'the-open-network',
          vs_currencies: 'amd',
        },
      });

      return response.data['the-open-network'].amd;
    } catch (error) {
      console.error('Ошибка получения курса TON → AMD:', error);
      return null;
    }
  }

   // ✅ Функция для форматирования даты
   private formatDate(date: Date): string {
    if (!date) return 'Нет данных';

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getTransactionHistory(@Request() req, @Query('type') type?: TransactionType) {
    const userId = req.user.userId;

    // Формируем запрос в базу
    const query = this.transactionsRepository.createQueryBuilder('transaction')
    .leftJoinAndSelect('transaction.user', 'user') // ✅ Делаем JOIN с пользователем
    .where('user.id = :userId', { userId }) // ✅ Теперь проверяем user.id
    .orderBy('transaction.created_at', 'DESC');


    // Если передан фильтр по типу транзакции
    if (type) {
      query.andWhere('transaction.type = :type', { type });
    }

    const transactions = await query.getMany();
    // ✅ Форматируем дату перед отправкой клиенту
    return transactions.map(tx => ({
      ...tx,
      created_at: this.formatDate(tx.created_at),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post('deposit')
async createDeposit(@Request() req, @Body() body) {
  const userId = req.user.userId;
  const { amount, method } = body;

  if (!amount || amount <= 0) {
    throw new BadRequestException('Некорректная сумма пополнения');
  }

  if (method !== TransactionMethod.TONKEEPER) {
    throw new BadRequestException('Поддерживается только TonKeeper');
  }

  // 🔹 Проверяем, есть ли у пользователя `created` депозит
  const existingDeposit = await this.transactionsRepository.findOne({
    where: { user: { id: userId }, type: TransactionType.DEPOSIT, status: TransactionStatus.CREATED },
  });

  if (existingDeposit) {
    throw new BadRequestException('У вас уже есть активный депозит. Завершите его перед созданием нового.');
  }

  const user = await this.usersRepository.findOne({ where: { id: userId } });
  if (!user) throw new BadRequestException('Пользователь не найден');

  // 🔹 Получаем курс TON → AMD
  const tonRate = await this.getTonRate();
  if (!tonRate) {
    throw new BadRequestException('Не удалось получить курс TON');
  }

  // 🔹 Конвертируем сумму в TON
  const amountInTon = parseFloat((amount / tonRate).toFixed(6));

  // 🔹 Создаём ссылку на оплату в TonKeeper
  const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${process.env.TON_WALLET_ADDRESS}?amount=${amountInTon}&text=userId-${userId}`;

  // 🔹 Создаём транзакцию в БД
  const deposit = new Transaction();
  deposit.user = user;
  deposit.type = TransactionType.DEPOSIT;
  deposit.amount = amount;
  deposit.ton_amount = amountInTon;
  deposit.method = TransactionMethod.TONKEEPER;
  deposit.status = TransactionStatus.CREATED;

  const savedDeposit = await this.transactionsRepository.save(deposit);

  return {
    message: "Ссылка для оплаты создана",
    id: savedDeposit.id,
    link: tonkeeperUrl,
    ton_amount: savedDeposit.ton_amount,
    status: deposit.status,
  };
}


  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  async requestWithdrawal(@Request() req, @Body() body) {
    const userId = req.user.userId;
    const { amount, method, recipient } = body;

    if (!amount || amount <= 0) {
      throw new BadRequestException('Некорректная сумма вывода');
    }

    if (method !== TransactionMethod.CARD) {
      throw new BadRequestException('Вывод доступен только на карту');
    }

    if (!recipient || recipient.trim() === '') {
      throw new BadRequestException('Необходимо указать номер карты');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Пользователь не найден');

    if (user.balance < amount) {
      throw new BadRequestException('Недостаточно средств');
    }

    user.balance -= amount;
    await this.usersRepository.save(user);

    const withdrawal = new Transaction();
    withdrawal.user = user;
    withdrawal.type = TransactionType.WITHDRAWAL;
    withdrawal.amount = amount;
    withdrawal.method = method;
    withdrawal.status = TransactionStatus.PENDING;
    withdrawal.recipient = recipient;
    await this.transactionsRepository.save(withdrawal);

    return { message: 'Запрос на вывод отправлен', amount, method, recipient, status: withdrawal.status };
  }

  // ✅ Метод отмены депозита
  @UseGuards(JwtAuthGuard)
  @Delete(':id/cancel')
  async cancelDeposit(@Request() req, @Param('id') id: number) {
    const userId = req.user.userId;

    // 🔹 Ищем транзакцию
    const transaction = await this.transactionsRepository.findOne({
      where: { id, user: { id: userId }, type: TransactionType.DEPOSIT, status: TransactionStatus.CREATED },
      relations: ['user'],
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена или уже обработана');
    }

    // 🔹 Удаляем транзакцию
    await this.transactionsRepository.remove(transaction);

    return { message: 'Транзакция успешно отменена' };
  }
}
