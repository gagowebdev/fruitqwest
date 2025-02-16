import 'dotenv/config'; // ✅ Добавлено
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import './bot'; // 👈 Теперь bot.ts будет собираться вместе с backend


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('✅ API запускается без глобальных Guard\'ов');

  // Разрешаем CORS
  app.enableCors({
    origin: 'https://fruitquest.vercel.app', // Указываем адрес фронтенда
    // origin: 'http://localhost:5173', // Указываем адрес фронтенда
    credentials: true, // Разрешаем передачу cookies и заголовков авторизации
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    methods: 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
