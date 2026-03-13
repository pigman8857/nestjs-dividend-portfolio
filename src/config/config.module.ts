import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ConfigService } from './config.service';
import mongoConfig from './mongo.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      // In production, rely solely on real environment variables — no .env file
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: '.env',
      load: [mongoConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        MONGO_URI: Joi.string().uri().required(),
        MONGO_DB_NAME: Joi.string().required(),
        LOG_LEVEL: Joi.string()
          .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
          .default('info'),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
