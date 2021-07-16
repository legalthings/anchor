import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { InfoModule } from './info/info.module';
import { AnchorModule } from './anchor/anchor.module';
import { HashModule } from './hash/hash.module';
import { IdentityModule } from './identity/identity.module';
import { NodeModule } from './node/node.module';
import { RedisModule } from './redis/redis.module';
import { RequestModule } from './request/request.module';
import { TransactionModule } from './transaction/transaction.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { DemoModule } from './demo/demo.module';
import { AuthModule } from './auth/auth.module';
import { IndexModule } from './index/index.module';
import { EmitterModule } from './emitter/emitter.module';
import { AssociationsModule } from './associations/associations.module';
import { PublicKeyModule } from './public-key/public-key.module';
import { SupplyModule } from './supply/supply.module';
import { TrustNetworkModule } from './trust-network/trust-network.module';

export const AppModuleConfig = {
  imports: [
    LoggerModule,
    ConfigModule,
    DemoModule,
    RequestModule,
    InfoModule,
    HealthModule,
    AnchorModule,
    HashModule,
    IdentityModule,
    NodeModule,
    RedisModule,
    TransactionModule,
    StorageModule,
    AuthModule,
    IndexModule,
    EmitterModule,
    AssociationsModule,
    PublicKeyModule,
    SupplyModule,
    TrustNetworkModule,
  ],
  controllers: [AppController],
  providers: [],
};

@Module(AppModuleConfig)
export class AppModule { }
