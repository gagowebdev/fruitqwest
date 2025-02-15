import { Controller, Get, Post, Body, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './packages.entity';
import { User } from 'src/users/users.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Transaction, TransactionType, TransactionStatus } from 'src/transactions/transactions.entity';

@Controller('packages')
export class PackagesController {
  constructor(
    @InjectRepository(Package) private packagesRepository: Repository<Package>,
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Transaction) private transactionsRepository: Repository<Transaction>,
  ) {}

  @Get()
  async getPackages() {
    return await this.packagesRepository.find();
  }

  @UseGuards(JwtAuthGuard)
  @Post('buy')
  async buyPackage(@Request() req, @Body() body) {
    const userId = req.user.userId;
    const { packageId } = body;

    // Получаем пользователя
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['package'], // ✅ Загружаем пакет
    });

    if (!user) throw new BadRequestException('Пользователь не найден');

    // Проверяем, есть ли уже купленный пакет
    if (user.package) throw new BadRequestException('Вы уже приобрели пакет');

    // Получаем информацию о пакете
    const packageToBuy = await this.packagesRepository.findOne({ where: { id: packageId } });
    if (!packageToBuy) throw new BadRequestException('Пакет не найден');

    // Проверяем, хватает ли денег
    if (user.balance < packageToBuy.price) {
      throw new BadRequestException('Недостаточно средств');
    }

    // Вычитаем деньги и назначаем пакет
    user.balance -= packageToBuy.price;
    user.package = packageToBuy;
    await this.usersRepository.save(user);

    // Создаём запись о транзакции покупки
    const transaction = new Transaction();
    transaction.user = user;
    transaction.type = TransactionType.PACKAGE_PURCHASE;
    transaction.amount = packageToBuy.price;
    transaction.status = TransactionStatus.APPROVED; // ✅ Сразу подтверждено
    await this.transactionsRepository.save(transaction);

    // 🔹 **Начисляем бонус рефереру с учетом личного лимита**
    if (user.referrer_id) {
      const referrer = await this.usersRepository.findOne({
        where: { id: user.referrer_id },
        relations: ['package'],
      });

      if (referrer && referrer.package) {
        const bonusAmount = packageToBuy.referral_bonus;

        // ✅ Считаем ЛИЧНЫЙ лимит (package + personalEarningsLimit)
        const earningsLimit = Number(referrer.package.earnings_limit) || 0;
        const personalLimit = Number(referrer.personalEarningsLimit) || 0;
        const totalEarningsLimit = earningsLimit + personalLimit;


        // ✅ Проверяем, сколько уже заработано
        const totalEarned = await this.transactionsRepository
          .createQueryBuilder('transaction')
          .where('transaction.user = :userId', { userId: referrer.id })
          .andWhere('transaction.type = :type', { type: TransactionType.REFERRAL_BONUS })
          .select('SUM(transaction.amount)', 'total')
          .getRawOne();

        const earnedAmount = parseFloat(totalEarned.total) || 0;

        console.log(`🔍 Лимит реферального дохода: ${totalEarningsLimit}, Заработано: ${earnedAmount}`);

        // ✅ Если реферал не превысил лимит, начисляем бонус
        if (earnedAmount < totalEarningsLimit) {
          referrer.balance += bonusAmount;
          await this.usersRepository.save(referrer);

          // Записываем бонусную транзакцию
          const bonusTransaction = new Transaction();
          bonusTransaction.user = referrer;
          bonusTransaction.type = TransactionType.REFERRAL_BONUS;
          bonusTransaction.amount = bonusAmount;
          bonusTransaction.referral_id = user.id; // ✅ Сохраняем ID реферала
          await this.transactionsRepository.save(bonusTransaction);

          console.log(`✅ Бонус ${bonusAmount} начислен пользователю ${referrer.id}`);
        } else {
          console.log(`⚠️ Лимит заработка достигнут, бонус не начисляется.`);
        }
      }
    }

    return { message: 'Пакет успешно куплен', package: packageToBuy.name };
  }

}
