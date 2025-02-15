import { Injectable, NotFoundException, BadRequestException,forwardRef, Inject, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./users.entity";
import { Repository, MoreThan } from "typeorm";
import * as bcrypt from "bcryptjs"; // Для хеширования паролей
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AppGateway } from '../app.gateway';
import { StoreItem, StoreItemType } from '../game-store/entities/store-item.entity'; // ✅ Импортируем StoreItem и StoreItemType
import { UserPurchase } from "../game-store/entities/user-purchase.entity";
import { omit } from 'lodash';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) // ✅ Убеждаемся, что этот декоратор стоит перед репозиторием
    private readonly usersRepository: Repository<User>,

    @Inject(forwardRef(() => AppGateway)) // ✅ Исправляем
    private readonly appGateway: AppGateway,

    @InjectRepository(StoreItem) // ✅ Добавляем репозиторий товаров
    private readonly storeItemRepo: Repository<StoreItem>,

    @InjectRepository(UserPurchase) // ✅ Подключаем UserPurchaseRepo
    private readonly userPurchaseRepo: Repository<UserPurchase>,

  ) {}

  async findById(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async findByIdWithRelations(userId: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id: userId },
      relations: ['package'], // ✅ Загружаем package
    });
  }


  async findByLogin(login: string, requesterId: number): Promise<User | null> {
    if (!requesterId) throw new ForbiddenException('Доступ запрещён');
    return this.usersRepository.findOne({ where: { login } });
  }
  
  
  
  

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user); // ❌ Без omit
  }

  
  
  

  // Метод для изменения пароля
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;
    
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("Пользователь не найден");
  
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isOldPasswordValid) throw new BadRequestException("Неверный старый пароль");
  
    if (oldPassword === newPassword) {
      throw new BadRequestException("Новый пароль не должен совпадать со старым");
    }
  
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password_hash = hashedPassword;
  
    await this.usersRepository.save(user);
    return { message: "Пароль успешно изменен" };
  }
  

  async handleClick(userId: number): Promise<{ gameBalance: number, clickValue: number }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return { gameBalance: 0, clickValue: 1 };
  
    const skin = await this.storeItemRepo.findOne({ where: { id: user.skinId, type: StoreItemType.SKIN } });
    const activeMultiplier = await this.userPurchaseRepo.findOne({
      where: { 
        user: { id: userId }, 
        item: { type: StoreItemType.MULTIPLIER },
        expiresAt: MoreThan(new Date()) 
      }, 
      relations: ['item']
    });
  
    const skinMultiplier = skin?.multiplier ?? 1;
    const boostMultiplier = activeMultiplier?.item.multiplier ?? 1;
    const totalMultiplier = skinMultiplier * boostMultiplier;
  
    // 📌 Инкремент кликов (НЕ учитывая множители)
    user.clicks += 1; 
  
    // 📌 Обновление баланса с округлением
    user.gameBalance = parseFloat((user.gameBalance + 1 * totalMultiplier).toFixed(2));
  
    // ✅ Проверяем, достиг ли пользователь нового уровня
    const clicksNeededForNextLevel = Math.floor(100 * Math.pow(1.3, user.level - 1));
    if (user.clicks >= clicksNeededForNextLevel) {
      user.level += 1;
      const bonus = (user.level - 1) * 10; // 🎁 Бонус должен быть: 10, 20, 30...
      user.gameBalance += bonus;
      
      // ✅ Отправляем WebSocket-сообщение
      this.appGateway.sendLevelUp(user.id, user.level, user.gameBalance, bonus);
    }
    const clickValue = 1 * skinMultiplier * boostMultiplier;
  
    await this.usersRepository.save(user);
    return { gameBalance: user.gameBalance, clickValue };
  }
  







  
  
}
