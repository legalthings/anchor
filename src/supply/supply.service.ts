import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { ActivationStatus, NodeService } from '../node/node.service';
import { RequestService } from '../request/request.service';
import LockedSupplyData from './locked-supply.data.json';

export interface BridgeStats {
  burn_rate: number;
  burned: number;
  volume: {
    lto: {
      address: string;
      total: number;
      supply: number;
      burned: number;
      remaining: number;
      burn_fee: number;
    },
    lto20: {
      address: string;
      total: number;
      supply: number;
      bridge: number;
      initial: number;
      burned: number;
      burn_fee: number;
    },
    binance: {
      address: string;
      total: number;
      bridge: number;
      supply: number;
      burn_fee: number;
    }
  }
}

@Injectable()
export class SupplyService {
  private bridgeUrl: string = 'https://bridge.lto.network'

  constructor(
    private readonly node: NodeService,
    private readonly storage: StorageService,
    private readonly request: RequestService,
  ) { }
  // What is supply:
  //        total supply
  //        minus balance of burn wallets
  //        minus amount burned in ERC20 (or LTO20)
  //        minus TX fee burn
  //        minus locked from spreadsheet
  async getCirculatingSupply(): Promise<string> {
    const txFeeBurn = await this.getTxFeeBurned();
    const bridgeStats = await this.request.get<BridgeStats>(`${this.bridgeUrl}/stats`);
    if (bridgeStats instanceof Error) {
      return Promise.reject(bridgeStats);
    }

    const locked = this.getLockedSupply();
    const result = this.calculateCirculatingSupply(bridgeStats.data, locked, txFeeBurn);

    return this.fixedDecimals(result);
  }

  async getMaxSupply(): Promise<string> {
    const bridgeStats = await this.request.get<BridgeStats>(`${this.bridgeUrl}/stats`);
    if (bridgeStats instanceof Error) {
      return Promise.reject(bridgeStats);
    }

    const maxSupply = bridgeStats.data.volume.lto.supply + bridgeStats.data.volume.lto20.supply;

    return this.fixedDecimals(maxSupply)
  }

  private calculateCirculatingSupply(stats: BridgeStats, locked: number, burnFee: number): number {
    return (
      stats.volume.lto.supply
      + stats.volume.lto20.supply
      - stats.volume.lto.burned
      - stats.volume.lto20.burned
      - burnFee
      - locked
    );
  }

  private fixedDecimals(input: number): string {
    return (Math.round(input * 100) / 100).toFixed(8);
  }

  async incrTxFeeBurned(blockHeight: number): Promise<void> {
    const isFeatureActivated = await this.isFeatureActivated(blockHeight);
    if (!isFeatureActivated) {
      return;
    }

    const current = await this.storage.getTxFeeBurned().catch<number>(() => 0);

    const burnFee = 0.1;
    const newValue = current + (1 * burnFee);

    return this.storage.setTxFeeBurned(newValue.toString());
  }

  async getTxFeeBurned(): Promise<number> {
    return this.storage.getTxFeeBurned();
  }

  async getFeeBurnFeatureHeight(): Promise<number | Error> {
    return this.storage.getFeeBurnFeatureHeight();
  }

  async isFeatureActivated(blockHeight: number): Promise<boolean> {
    const activationHeight = await this.getFeeBurnFeatureHeight().catch<number | Error>(() => null);

    if (!activationHeight) {
      const activationStatus = await this.node.getActivationStatus().catch<ActivationStatus>(() => null);
      if (!activationStatus) {
        return false;
      }
  
      const feeBurnFeature = activationStatus.features.find(each => each.id === 12);
      if (!feeBurnFeature || !feeBurnFeature.activationHeight) {
        return false;
      }

      await this.storage.setFeeBurnFeatureHeight(feeBurnFeature.activationHeight.toString());
  
      if (blockHeight < feeBurnFeature.activationHeight) {
        return false;
      }
    }

    if (blockHeight < activationHeight) {
      return false;
    }

    return true;
  }

  private getLockedSupply(): number {
    const year = moment().format('YYYY');
    const month = moment().format('MMM').toLowerCase();

    return LockedSupplyData[year][month] || 0;
  }
}
