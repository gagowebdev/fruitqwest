import 'dotenv/config'; // ✅ Добавлено
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('✅ API запускается без глобальных Guard\'ов');

  // Разрешаем CORS
  app.enableCors({
    origin: 'https://fruitquest.vercel.app', // Указываем адрес фронтенда
    credentials: true, // Разрешаем передачу cookies и заголовков авторизации
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    methods: 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
