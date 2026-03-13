import { Schema } from 'mongoose';
import { Logger } from '@nestjs/common';

const logger = new Logger('MongooseQuery');

type QueryOp =
  | 'find'
  | 'findOne'
  | 'findOneAndUpdate'
  | 'findOneAndDelete'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany'
  | 'countDocuments';

const QUERY_OPS: QueryOp[] = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
];

export function mongooseQueryPlugin(schema: Schema): void {
  for (const op of QUERY_OPS) {
    schema.pre(op, function () {
      (this as any)._startMs = Date.now();
    });

    schema.post(op, function () {
      const durationMs = Date.now() - (this as any)._startMs;
      logger.debug(
        {
          collection: (this as any).mongooseCollection?.name ?? 'unknown',
          op: (this as any).op,
          durationMs,
        },
        'mongo:query',
      );
    });
  }

  schema.pre('save', function () {
    (this as any)._startMs = Date.now();
  });

  schema.post('save', function () {
    const durationMs = Date.now() - (this as any)._startMs;
    logger.debug(
      {
        collection: (this as any).collection?.name ?? 'unknown',
        op: 'save',
        durationMs,
      },
      'mongo:insert',
    );
  });
}
