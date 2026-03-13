import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface MongoConfig {
  uri: string;
  dbName: string;
}

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService) {}

  get nodeEnv(): string {
    return this.config.getOrThrow<string>('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get<number>('PORT', 3000);
  }

  get mongo(): MongoConfig {
    return this.config.getOrThrow<MongoConfig>('mongo');
  }

  get logLevel(): string {
    return this.config.get<string>('LOG_LEVEL', 'info');
  }
}
