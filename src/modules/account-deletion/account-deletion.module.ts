import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "../users/users.module";
import { User } from "../users/user.entity";
import { Profile } from "../../profile/profile.entity";

import { AccountDeletionRequest } from "./account-deletion-request.entity";
import { AccountDeletionService } from "./account-deletion.service";
import { AccountDeletionController } from "./account-deletion.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AccountDeletionRequest, User, Profile]), UsersModule],
  providers: [AccountDeletionService],
  controllers: [AccountDeletionController],
})
export class AccountDeletionModule {}

