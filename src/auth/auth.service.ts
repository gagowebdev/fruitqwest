import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { JwtService } from '@nestjs/jwt';
import { AppGateway } from '../app.gateway'; // ✅ Импорт WebSocket

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly appGateway: AppGateway, // ✅ Добавляем WebSocket в конструктор
  ) {}

  async register(login: string, password: string, referrerId?: number) {
    // Проверяем, есть ли такой логин
    const existingUser = await this.usersRepository.findOne({ where: { login } });
    if (existingUser) throw new ConflictException('Логин уже используется');

    // Создаем нового пользователя
    const newUser = new User();
    newUser.login = login;
    await newUser.setPassword(password);
    newUser.referrer_id = referrerId ?? null;

    if (newUser.referrer_id) {
      const referrer = await this.usersRepository.findOne({ where: { id: referrerId } });
      if (referrer) {
        // ✅ Теперь referrer определён и можно отправлять WebSocket-сообщение
        this.appGateway.sendReferralUpdate(referrer.id, { newReferral: newUser.login });
      }
    }
    

    await this.usersRepository.save(newUser);
    return { message: 'Регистрация успешна' };
  }

  async login(login: string, password: string) {
    const user = await this.usersRepository.findOne({ where: { login } });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    
    if (user.isBlocked) {
      throw new UnauthorizedException('Ваш аккаунт заблокирован');
    }
    
    

    if (!(await user.validatePassword(password))) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const token = this.jwtService.sign({ userId: user.id, role: user.role });
    return { token };
  }
}
