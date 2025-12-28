import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevSeedController } from './dev-seed.controller';
import { UsersModule } from '../modules/users/users.module';
import { Staff } from '../modules/staff/staff.entity';
import { Venue } from '../modules/venues/venue.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Staff, Venue]),
  ],
  controllers: [DevSeedController],
})
export class DevSeedModule {}
