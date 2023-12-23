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
    new FastifyAdapter({ logger: true }),
  );
  const options = new DocumentBuilder()
    .setTitle('Image Optimizer API')
    .setDescription('The Image Optimizer API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('swagger', app, document);

  app
    .getHttpAdapter()
    .getInstance()
    .register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
    });

  // somewhere in your initialization file
  app.register(import('@fastify/compress'));

  // If you are not going to use CSP at all, you can use this:
  app.getHttpAdapter().getInstance().register(helmet, {
    contentSecurityPolicy: false,
  });
  app.getHttpAdapter().getInstance().register(import('@fastify/rate-limit'), {
    max: 60,
    timeWindow: '1 minute',
  });
  app.enableCors();
  app.getHttpAdapter().getInstance().register(import('@fastify/multipart'), {
    attachFieldsToBody: true,
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
