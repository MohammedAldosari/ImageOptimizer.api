import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from '@fastify/helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 26214400 /*25MB*/ }),
  );
  const options = new DocumentBuilder()
    .setTitle('Image Optimizer API')
    .setDescription('The Image Optimizer API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);

  // somewhere in your initialization file
  await app.register(import('@fastify/compress'));

  // If you are not going to use CSP at all, you can use this:
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(import('@fastify/rate-limit'), {
    max: 60,
    timeWindow: '1 minute',
  });
  app.enableCors();
  await app.register(import('@fastify/multipart'), {
    attachFieldsToBody: true,
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
