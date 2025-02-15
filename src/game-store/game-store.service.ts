import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { StoreItem, StoreItemType } from './entities/store-item.entity';
import { UserPurchase } from './entities/user-purchase.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.entity';
import { AppGateway } from '../app.gateway';
import { log } from 'console';


@Injectable()
export class GameStoreService {
  constructor(
    @InjectRepository(StoreItem)
    private readonly storeItemRepo: Repository<StoreItem>,

    @InjectRepository(UserPurchase)
    private readonly userPurchaseRepo: Repository<UserPurchase>,

    private readonly usersService: UsersService,

    @Inject(forwardRef(() => AppGateway))
    private readonly appGateway: AppGateway, // ✅ Добавляем WebSocket-шлюз
  ) {}

  // ✅ Проверяем и удаляем истёкшие множители
  async checkExpiredBoosters(userId: number) {
    const now = new Date();

    // Ищем истёкшие множители
    const expiredBoosters = await this.userPurchaseRepo.find({
      where: { user: { id: userId }, expiresAt: LessThan(now) },
      relations: ['item'],
    });

    if (expiredBoosters.length) {
      console.log(`⏳ Удаляем ${expiredBoosters.length} истёкших бустеров у пользователя ${userId}`);

      // Отправляем уведомление через WebSocket
      this.appGateway.server.to(`user_${userId}`).emit('booster_expired', {
        message: 'Ваш бустер истёк!',
      });

      // Удаляем бустеры
      await this.userPurchaseRepo.remove(expiredBoosters);
    }
  }

  // async seedStoreItems() {
  //   const items = [

  //     { name: 'Банан', type: StoreItemType.SKIN, price: 100, multiplier: 1.2 },
  //     { name: 'Арбуз', type: StoreItemType.SKIN, price: 250, multiplier: 1.7 },
  //     { name: 'Дыня', type: StoreItemType.SKIN, price: 500, multiplier: 2.0 },
  //     { name: 'Яблоко', type: StoreItemType.SKIN, price: 1000, multiplier: 3.0 },
  
  //     { name: 'x2 на 12 часов', type: StoreItemType.MULTIPLIER, price: 500, multiplier: 2, duration: 12 },
  //     { name: 'x2 на 24 часа', type: StoreItemType.MULTIPLIER, price: 900, multiplier: 2, duration: 24 },
  
  //     { name: '+10% к реферальному лимиту', type: StoreItemType.REFERRAL_LIMIT_BOOST, price: 800, bonus: 10 },
  //     { name: '+20% к реферальному лимиту', type: StoreItemType.REFERRAL_LIMIT_BOOST, price: 1400, bonus: 20 },
  //   ];
  
  //   for (const item of items) {
  //     const exists = await this.storeItemRepo.findOne({ where: { name: item.name } });
  //     if (!exists) {
  //       await this.storeItemRepo.save(this.storeItemRepo.create(item));
  //     }
  //   }
  
  //   console.log('✅ Магазин товаров загружен!');
  // }
  

  // onModuleInit() {
  //   this.seedStoreItems();
  // }

  async getAllItems(): Promise<StoreItem[]> {
    return this.storeItemRepo.find();
  }
  
  

  // ✅ Покупка товара
  async buyItem(userId: number, itemId: number): Promise<{ message: string }> {
    const user = await this.usersService.findByIdWithRelations(userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const item = await this.storeItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Товар не найден');

    // ✅ Проверка баланса
    if (user.gameBalance < item.price) {
      throw new BadRequestException('Недостаточно средств');
    }

    // ✅ Ограничения на покупку бустера реферального лимита
    if (item.type === StoreItemType.REFERRAL_LIMIT_BOOST) {
      if (!user.package) {
        console.log(user);
        throw new BadRequestException('У вас нет активного реферального пакета');
      }

      // ✅ Проверяем, покупал ли он ЛЮБОЙ бустер лимита раньше
      const existingBoost = await this.userPurchaseRepo.findOne({
        where: { user, item: { type: StoreItemType.REFERRAL_LIMIT_BOOST } },
        relations: ['item'],
      });

      if (existingBoost) {
        throw new BadRequestException('Вы уже покупали бустер для реферального лимита и не можете купить снова');
      }

      // ✅ Увеличиваем ЛИЧНЫЙ лимит реферального заработка
      user.personalEarningsLimit = Number(user.personalEarningsLimit);

      const bonusAmount = user.package.earnings_limit * ((item.bonus ?? 0) / 100);

      user.personalEarningsLimit = parseFloat((user.personalEarningsLimit + bonusAmount).toFixed(2));


      // ✅ Сохраняем изменения
      await this.usersService.save(user);
    }


    // ✅ Ограничения на покупку множителя
    if (item.type === StoreItemType.MULTIPLIER) {
      const activeMultiplier = await this.userPurchaseRepo.findOne({ 
        where: { user, item: { type: StoreItemType.MULTIPLIER }, expiresAt: MoreThan(new Date()) }
      });

      if (activeMultiplier) {
        throw new BadRequestException('У вас уже есть активный множитель');
      }
    }

    // ✅ Ограничения на покупку скинов
    if (item.type === StoreItemType.SKIN) {
      // 1️⃣ Получаем список ВСЕХ доступных скинов, сортируем по ID
        const availableSkins = await this.storeItemRepo.find({
          where: { type: StoreItemType.SKIN },
          order: { id: 'ASC' }
        });

        // 2️⃣ Находим текущий скин пользователя в списке доступных
        const currentSkinIndex = availableSkins.findIndex(skin => skin.id === user.skinId);

        // 3️⃣ Проверяем, является ли покупаемый скин **следующим в списке**
        if (currentSkinIndex === -1 || availableSkins[currentSkinIndex + 1]?.id !== item.id) {
          throw new BadRequestException('Вы должны покупать скины последовательно');
        }


      // ✅ Меняем скин
      user.skinId = item.id;
    }

    // ✅ Списываем баланс
    user.gameBalance -= item.price;

    // ✅ Сохраняем покупку
    const purchase = this.userPurchaseRepo.create({
      user,
      item,
      expiresAt: item.duration ? new Date(Date.now() + item.duration * 60 * 60 * 1000) : null,
    });

    await this.userPurchaseRepo.save(purchase);
    await this.usersService.save(user);

    return { message: 'Покупка успешно совершена' };
  }
}
