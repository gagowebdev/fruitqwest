import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Transaction, TransactionType } from '../transactions/transactions.entity';

@Controller('referrals')
export class ReferralsController {
  constructor(
    @InjectRepository(Transaction) private transactionsRepository: Repository<Transaction>,
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  @UseGuards(JwtAuthGuard) // Защищаем маршрут
  @Get()
  async getReferrals(@Request() req) {
    const userId = req.user.userId;
    const referrals = await this.usersRepository.find({
      where: { referrer_id: userId },
      select: ['id', 'login', 'package'], // Выбираем только нужные поля
      relations: ['package'],
    });

    return referrals.map((ref) => ({
      id: ref.id,
      login: ref.login,
      package: ref.package ? ref.package.name : 'Без пакета',
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getReferralStats(@Request() req) {
    const userId = req.user.userId;

    // 1️⃣ Считаем общее количество рефералов
    const totalReferrals = await this.usersRepository.count({
      where: { referrer_id: userId }
    });

    // 2️⃣ Считаем, сколько из них купили пакеты
    const referralsWithPackages = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.referrer_id = :userId', { userId })
      .andWhere('user.package_id IS NOT NULL')
      .getCount();

    // 3️⃣ Считаем сумму всех реферальных бонусов
    const totalEarned = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
      .select('SUM(transaction.amount)', 'total')
      .getRawOne();

    const earnedAmount = parseFloat(totalEarned.total) || 0;

    // 4️⃣ Получаем лимит заработка пользователя
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['package']
    });

    const earningsLimit = user?.package?.earnings_limit || 0;
    const remainingLimit = Math.max(earningsLimit - earnedAmount, 0); // Не может быть отрицательным

    return {
      total_referrals: totalReferrals,
      referrals_with_packages: referralsWithPackages,
      total_earnings: earnedAmount,
      earnings_limit: earningsLimit,
      remaining_limit: remainingLimit
    };
  }



  @UseGuards(JwtAuthGuard)
  @Get('earnings')
  async getReferralEarnings(@Request() req) {
    const userId = req.user.userId;

    // Считаем сумму всех начисленных реферальных бонусов
    const totalEarned = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .where('transaction.user = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
      .select('SUM(transaction.amount)', 'total')
      .getRawOne();

    const earnedAmount = parseFloat(totalEarned.total) || 0;

    // Получаем список рефералов, которые принесли доход
    const referralEarnings = await this.transactionsRepository
    .createQueryBuilder('transaction')
    .leftJoin('users', 'referral', 'referral.id = transaction.referral_id') // ✅ Теперь у нас есть ID реферала
    .where('transaction.user_id = :userId', { userId }) // ✅ Находим бонусы, полученные пользователем
    .andWhere('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
    .select([
      'transaction.amount AS bonus',
      'transaction.created_at AS date',
      'referral.id AS referral_id',
      'referral.login AS referral_login'
    ])
    .orderBy('transaction.created_at', 'DESC')
    .getRawMany();






  return {
    total_earnings: earnedAmount,
    referrals: referralEarnings.map((t) => ({
      id: t.referral_id, 
      login: t.referral_login, 
      bonus: t.bonus,
      date: t.date
    })),
  };
  }
}
