import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './asset.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }])],
  exports: [MongooseModule],
})
export class AssetsModule {}
