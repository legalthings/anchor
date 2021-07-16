import { Module } from '@nestjs/common';
import { SupplyService } from './supply.service';
import { ConfigModule } from '../config/config.module';
import { LoggerModule } from '../logger/logger.module';
import { StorageModule } from '../storage/storage.module';
import { NodeModule } from '../node/node.module';
import { RequestModule } from '../request/request.module';
import { SupplyController } from './supply.controller';

export const SupplyModuleConfig = {
  imports: [
    LoggerModule,
    ConfigModule,
    StorageModule,
    NodeModule,
    RequestModule,
  ],
  controllers: [SupplyController],
  providers: [
    SupplyService,
  ],
  exports: [
    SupplyService,
  ],
};

@Module(SupplyModuleConfig)
export class SupplyModule { }
