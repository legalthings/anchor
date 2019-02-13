import { Injectable } from '@nestjs/common';
import { ConfigLoaderService } from './config-loader.service';

@Injectable()
export class ConfigService {
  constructor(private readonly config: ConfigLoaderService) { }

  getEnv(): string {
    return this.config.get('env');
  }

  getPort(): string {
    return this.config.get('port');
  }

  getLtoApiKey(): string {
    return this.config.get('lto.api.key');
  }

  getLtoNodeUrl(): string {
    return this.config.get('lto.node.url');
  }

  getNodeUrl(): string {
    const config = this.getLtoNodeUrl();

    if (config) {
      return config;
    }

    return this.config.get('anchor.node.url');
  }

  getNodeStartingBlock(): number | string {
    return this.config.get('anchor.node.starting_block');
  }

  getNodeRestartSync(): boolean {
    return this.config.get('anchor.node.restart_sync');
  }

  getAuthToken(): string {
    return this.config.get('anchor.auth.token');
  }

  getApiSecret(): string {
    const config = this.getLtoApiKey();

    if (config) {
      return config;
    }

    return this.config.get('anchor.api.secret');
  }

  getAnchorFee(): number {
    return Number(this.config.get('anchor.node.anchor_fee'));
  }

  getRedisClient(): string | string[] {
    return this.getRedisUrl() || this.getRedisCluster().split(';');
  }

  getRedisUrl(): string {
    return this.config.get('anchor.redis.url');
  }

  getRedisCluster(): string {
    return this.config.get('anchor.redis.cluster');
  }

  getMonitorInterval(): number {
    return Number(this.config.get('anchor.monitor.interval'));
  }

  getLoggerGlobal(): { level } {
    return this.config.get('log');
  }

  getLoggerConsole(): { level } {
    const config = this.getLoggerGlobal();

    if (config.level) {
      return config;
    }

    return this.config.get('anchor.logger.console');
  }

  getLoggerCombined(): { level } {
    const config = this.getLoggerGlobal();

    if (config.level) {
      return config;
    }

    return this.config.get('anchor.logger.combined');
  }
}
