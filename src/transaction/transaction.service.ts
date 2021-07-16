import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import TransactionTypes from './const/types.const';
import { IndexDocumentType } from '../index/model/index.model';
import { LoggerService } from '../logger/logger.service';
import { StorageService } from '../storage/storage.service';
import { SupplyService } from '../supply/supply.service';

@Injectable()
export class TransactionService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly storage: StorageService,
    private readonly supply: SupplyService,
  ) { }

  getAllTypes(): Array<{ id: string, types: number[] }> {
    return Object.keys(TransactionTypes).map((k) => TransactionTypes[k]);
  }

  getIdentifiers(): string[] {
    const types = this.getAllTypes();
    return types.map((tx) => tx.id);
  }

  getIdentifierByType(type: number): string | null {
    const types = this.getAllTypes();
    const match = types.find((tx) => tx.types.indexOf(type) > -1);
    return match ? match.id : null;
  }

  getIdentifiersByType(type: number): string[] {
    const types = this.getAllTypes();
    return types.filter((tx) => tx.types.indexOf(type) > -1).map((match) => match.id);
  }

  hasIdentifier(identifier): boolean {
    const identifiers = this.getIdentifiers();
    return identifiers.indexOf(identifier) > -1;
  }

  async getStats(type: string, from: number, to: number): Promise<{period: string, count: number}[]> {
    return this.storage.getTxStats(type, from, to);
  }

  async index(index: IndexDocumentType) {
    const { transaction, blockHeight } = index;
    const identifiers = this.getIdentifiersByType(transaction.type);
    const promises = [] as Promise<any>[];

    if (identifiers.length === 0) {
      return false;
    }

    this.logger.debug(`transaction ${transaction.id}: ` + identifiers.join(' '));

    for (const identifier of identifiers) {
      promises.push(this.supply.incrTxFeeBurned(blockHeight));
      promises.push(this.storage.incrTxStats(identifier, Math.floor(transaction.timestamp / 86400000)));

      if (transaction.sender) {
        promises.push(this.storage.indexTx(identifier, transaction.sender, transaction.id, transaction.timestamp));
      }

      if (transaction.recipient) {
        promises.push(this.storage.indexTx(identifier, transaction.recipient, transaction.id, transaction.timestamp));
      }

      if (transaction.transfers) {
        for (const transfer of transaction.transfers) {
          promises.push(this.storage.indexTx(identifier, transfer.recipient, transaction.id, transaction.timestamp));
        }
      }
    }

    await Promise.all(promises);

    return true;
  }
}
