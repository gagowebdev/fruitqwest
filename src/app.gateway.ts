import { WebSocketGateway, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Inject, forwardRef } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { GameStoreService } from './game-store/game-store.service';

@WebSocketGateway({ cors: true })
export class AppGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => UsersService)) // ✅ Исправляем
    private readonly usersService: UsersService,

    @Inject(forwardRef(() => GameStoreService))
    private readonly gameStoreService: GameStoreService,
  ) {}

  async handleConnection(client: any) {
    console.log(`✅ Клиент подключился: ${client.id}`);
    console.log(`🔍 Всего подключений: ${this.server.engine.clientsCount}`);

    // Получаем userId из токена (если он есть)
    const userId = client.handshake.auth.userId;
    if (!userId) return;

    // Проверяем и удаляем истёкшие бустеры
    await this.gameStoreService.checkExpiredBoosters(userId);
  }
  
  handleDisconnect(client: any) {
    console.log(`❌ Клиент отключился: ${client.id}`);
    console.log(`🔍 Всего подключений: ${this.server.engine.clientsCount}`);
  }
  

  // ✅ Обработчик кликов
  @SubscribeMessage('click')
  async handleClick(client: any, payload: { userId: number }) {
    if (client.clickInProgress) return; // ✅ Не даём клиенту спамить

    client.clickInProgress = true; // ✅ Защита от двойных кликов

    const { gameBalance, clickValue } = await this.usersService.handleClick(payload.userId);
    
    console.log(`📡 Обновление баланса пользователя ${payload.userId}: ${gameBalance}`);

    this.server.to(`user_${payload.userId}`).emit('game_balance_update', { 
      gameBalance, 
      clickValue // ✅ Отправляем стоимость клика
  });

    // setTimeout(() => {
      client.clickInProgress = false; // ✅ Разрешаем клик через 1 секунду
    // }, 1000);
  }


  sendLevelUp(userId: number, newLevel: number, newBalance: number, bonus: number) {
    console.log(`📡 WebSocket: Новый уровень ${newLevel} у пользователя ${userId}, бонус: ${bonus}`);
    
    this.server.to(`user_${userId}`).emit('level_up', { 
      level: newLevel, 
      gameBalance: newBalance,
      bonus, // 🎁 Передаём размер бонуса
    });
  }
  



    // ✅ Обновление игрового баланса через WebSocket
    sendGameBalanceUpdate(userId: number, newBalance: number) {
      const roundedBalance = parseFloat(newBalance.toFixed(2)); // 📌 Округляем до 2 знаков
      console.log(`📡 WebSocket: обновление баланса пользователя ${userId}: ${roundedBalance}`);
      this.server.to(`user_${userId}`).emit('game_balance_update', { gameBalance: roundedBalance });
    }
    

  // Отправка события обновления баланса
  sendBalanceUpdate(userId: number, newBalance: number) {
    this.server.to(`user_${userId}`).emit('balance_update', { balance: newBalance });
  }

  // Отправка события обновления статуса транзакции
  sendTransactionUpdate(userId: number, transactionId: number, status: string) {
    this.server.to(`user_${userId}`).emit('transaction_update', { transactionId, status });
  }

  // ✅ Добавляем событие для обновления данных пользователя
  sendUserUpdate(userId: number, data: { login: string; role: string }) {
    this.server.to(`user_${userId}`).emit('user_update', data);
  }

  // ✅ Добавляем событие для обновления рефералов
  sendReferralUpdate(userId: number, data: { newReferral: string }) {
    this.server.to(`user_${userId}`).emit('referral_update', data);
  }

  // Отправка события обновления баланса при заказе вывода
  // sendBalanceDecrease(userId: number, newBalance: number) {
  //   this.server.to(`user_${userId}`).emit('balance_update', { balance: newBalance });
  // }

  // Подписка пользователя на свой канал
  @SubscribeMessage('subscribe')
  @SubscribeMessage('subscribe')
  handleSubscribe(client: any, payload: { userId: number }) {
    console.log(`📡 Клиент ${client.id} подписался на user_${payload.userId}`);
    
    // ✅ Очищаем старые подписки перед подпиской
    client.leaveAll(); 
    
    // ✅ Подписываем клиента только ОДИН раз
    client.join(`user_${payload.userId}`);
  }


}
