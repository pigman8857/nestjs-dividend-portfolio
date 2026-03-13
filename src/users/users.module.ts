import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './infrastructure/user.schema';
import { MongooseUserRepository } from './infrastructure/user.repository.impl';
import { USER_REPOSITORY } from './domain/user.repository';
import { UsersService } from './application/users.service';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [
    { provide: USER_REPOSITORY, useClass: MongooseUserRepository },
    UsersService,
  ],
  controllers: [UsersController],
  exports: [USER_REPOSITORY, UsersService],
})
export class UsersModule {}
