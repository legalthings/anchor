import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AnchorService } from './anchor/anchor.service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import {LoggerService} from './logger/logger.service';

async function swagger(app: INestApplication) {
  const options = new DocumentBuilder()
    .setTitle('Anchoring service')
    .setDescription('Anchor data in the blockchain')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await swagger(app);

  app.use(cors({ exposedHeaders: ['X-Total'] }));
  app.use(helmet());

  app.useStaticAssets(join(__dirname, '..', 'public'));

  const configService = app.get<ConfigService>(ConfigService);
  await app.listen(configService.getPort());

  const logger = app.get<LoggerService>(LoggerService);
  logger.info(`server: running on http://localhost:${configService.getPort()}`);

  const anchorService = app.get<AnchorService>(AnchorService);
  await anchorService.start();
}

bootstrap();
