import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Scope } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any; // Добавляем user, чтобы TypeScript не ругался
}

@Injectable({ scope: Scope.REQUEST })
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Токен не найден');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);
      request.user = { userId: payload.userId, role: payload.role }; // ✅ Теперь роль доступна в `request.user`
      return true;
    } catch (err) {
      throw new UnauthorizedException('Неверный или истёкший токен');
    }
  }
}
