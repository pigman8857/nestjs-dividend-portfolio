import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '../config/config.service';
import { mongooseQueryPlugin } from '../common/logger/mongoose-query.plugin';

const logger = new Logger('MongooseConnection');

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.mongo.uri,
        dbName: config.mongo.dbName,
        connectionFactory: (connection: any) => {
          connection.on('connected', () =>
            logger.log({ event: 'connected' }, '[ADB-TEST] MongoDB connected to Oracle ADB'),
          );
          connection.on('error', (err: Error) =>
            logger.error({ event: 'error', error: err.message }, '[ADB-TEST] MongoDB ADB connection error'),
          );
          connection.on('disconnected', () =>
            logger.warn({ event: 'disconnected' }, '[ADB-TEST] MongoDB ADB disconnected'),
          );
          connection.on('reconnected', () =>
            logger.log({ event: 'reconnected' }, '[ADB-TEST] MongoDB ADB reconnected'),
          );

          connection.plugin(mongooseQueryPlugin);

          return connection;
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
