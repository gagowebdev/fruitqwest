import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
import { GameStoreService } from './game-store.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoreItem } from './entities/store-item.entity';

@Controller('store')
export class GameStoreController {
  constructor(private readonly gameStoreService: GameStoreService) {}

  @UseGuards(JwtAuthGuard)
  @Post('buy')
  async buyItem(@Request() req, @Body('itemId') itemId: number) {
    const userId = req.user.userId;
    return this.gameStoreService.buyItem(userId, itemId);
  }

  @Get('items')
  async getStoreItems(): Promise<StoreItem[]> {
    return this.gameStoreService.getAllItems();
  }
}
