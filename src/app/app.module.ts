// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import your entities
import { Wallet } from '../modules/wallet/entities/wallet.entity';
import { StoreItem } from '../modules/store-items/entities/store-item.entity';
import { StoreItemOrder } from '../modules/store-items/entities/store-item-order.entity';
// Add the rest:
import { User } from '../modules/users/entities/user.entity';
import { Venue } from '../modules/venues/entities/venue.entity';
// ...any other entities

// Import your feature modules
import { AuthModule } from '../modules/auth/auth.module';
import { WalletModule } from '../modules/wallet/wallet.module';
import { StoreItemsModule } from '../modules/store-items/store-items.module';
// + UsersModule, VenuesModule, etc.

@Module({
  imports: [
    // 1) Load .env globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2) Centralized DB config
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST');
        const port = parseInt(config.get<string>('DB_PORT') ?? '5432', 10);
        const username = config.get<string>('DB_USERNAME');
        const password = config.get<string>('DB_PASSWORD');
        const database = config.get<string>('DB_NAME');
        const useSsl = config.get<string>('DB_SSL') === 'true';

        if (!password || typeof password !== 'string') {
          // This is the guard against the SASL error
          throw new Error(
            `DB_PASSWORD is invalid. Got: ${password} (type: ${typeof password})`,
          );
        }

        return {
          type: 'postgres' as const,
          host,
          port,
          username,
          password,
          database,
          entities: [Wallet, StoreItem, StoreItemOrder, User, Venue],
          synchronize: false, // keep false for prod safety
          ssl: useSsl
            ? {
                rejectUnauthorized: false,
              }
            : false,
        };
      },
    }),

    // 3) Feature modules
    AuthModule,
    WalletModule,
    StoreItemsModule,
    // UsersModule,
    // VenuesModule,
    // etc...
  ],
})
export class AppModule {}
