import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body) {
    return this.authService.register(body.login, body.password, body.referrerId);
  }

  @Post('login')
  async login(@Body() body) {
    return this.authService.login(body.login, body.password);
  }
}
