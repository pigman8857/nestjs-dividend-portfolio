import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './infrastructure/asset.schema';
import { MongooseAssetRepository } from './infrastructure/asset.repository.impl';
import { ASSET_REPOSITORY } from './domain/asset.repository';
import { AssetsService } from './application/assets.service';
import { AssetsController } from './presentation/assets.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }])],
  providers: [
    { provide: ASSET_REPOSITORY, useClass: MongooseAssetRepository },
    AssetsService,
  ],
  controllers: [AssetsController],
  exports: [ASSET_REPOSITORY, AssetsService],
})
export class AssetsModule {}
