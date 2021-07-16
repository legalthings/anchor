import { Injectable } from '@nestjs/common';
import { NodeApiService } from './node-api.service';
import { LoggerService } from '../logger/logger.service';
import { EncoderService } from '../encoder/encoder.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '../config/config.service';
import { Transaction } from '../transaction/interfaces/transaction.interface';
import { AxiosResponse } from 'axios';

export interface Feature {
  id: number;
  description: string;
  blockchainStatus: string;
  nodeStatus: string;
  activationHeight?: number;
}

export interface ActivationStatus {
  height: number;
  votingInterval: number;
  votingThreshold: number;
  nextCheck: number;
  features: Feature[];
}

/**
 * @todo Why does NodeService get things from storage?
 */
@Injectable()
export class NodeService {
  constructor(
    private readonly api: NodeApiService,
    private readonly logger: LoggerService,
    private readonly encoder: EncoderService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) { }

  async getNodeWallet(): Promise<string> {
    const response = await this.api.getNodeAddresses();

    if (response instanceof Error) {
      throw response;
    }

    if (!response.data.length) {
      throw new Error(`node: no addresses in node's wallet`);
    }

    return response.data[0];
  }

  async getUnconfirmedAnchor(hash: string): Promise<string | null> {
    const response = await this.api.getUnconfirmedTransactions();

    if (response instanceof Error) {
      throw response;
    }

    const unconfirmed = response.data.filter((transaction) => {
      if (transaction.type !== 12) {
        return false;
      }

      if (transaction.data.find((data) => data.value && data.value === `base64:${hash}`)) {
        return true;
      }

      return false;
    });

    if (unconfirmed.length === 0) {
      return null;
    }

    return unconfirmed.map(transaction => transaction.id)[0];
  }

  async getLastBlockHeight(): Promise<number> {
    const response = await this.api.getLastBlock();

    if (response instanceof Error) {
      throw response;
    }

    return response.data.height;
  }

  async getBlock(id: string | number): Promise<{ height, transactions, timestamp }> {
    const response = await this.api.getBlock(id);

    if (response instanceof Error) {
      throw response;
    }

    return response.data;
  }

  async getBlocks(from: number, to: number): Promise<Array<{ height, transactions }>> {
    const ranges = this.getBlockRanges(from, to);
    const promises = ranges.map((range) => this.api.getBlocks(range.from, range.to));
    const responses = await Promise.all(promises);

    for (const response of responses) {
      if (response instanceof Error) {
        throw response;
      }
    }

    const data = responses.map((response: AxiosResponse) => response.data);

    return []
      .concat(...data)
      .sort((a, b) => a.height - b.height);
  }

  getBlockRanges(from: number, to: number): Array<{ from, to }> {
    const ranges = [];

    if (from === to) {
      ranges.push({ from, to });
    }

    // public node doesn't allow getting more than 100 blocks at a time
    for (let start = from; start < to; start += 100) {
      const range = start + 99;
      const max = range > to ? to : range;
      ranges.push({ from: start, to: max });
    }

    return ranges;
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const response = await this.api.getTransaction(id);

    if (response instanceof Error) {
      throw response;
    }

    return response.data;
  }

  async getTransactions(id: string[]): Promise<Transaction[] | null> {
    const promises = id.map((tx) => this.getTransaction(tx));
    const results = await Promise.all(promises.map(p => p.catch(e => e)));
    return results.filter(result => !(result instanceof Error));
  }

  async createAnchorTransaction(senderAddress: string, hash: string): Promise<string> {
    const response = await this.api.sendTransaction({
      version: 1,
      type: 15,
      sender: senderAddress,
      anchors: [
        hash,
      ],
      fee: this.config.getAnchorFee(),
      timestamp: Date.now(),
    });

    if (response instanceof Error) {
      throw response;
    }

    return response.data.id;
  }

  async anchor(hash: string, encoding: string): Promise<{
    '@context', type, targetHash, anchors,
  } | null> {
    this.logger.debug(`hash: starting anchoring '${hash}' as '${encoding}'`);

    try {
      const senderAddress = await this.getNodeWallet();
      const base58Hash = this.encoder.base58Encode(this.encoder.decode(hash, encoding));
      const transactionId = await this.createAnchorTransaction(senderAddress, base58Hash);

      if (!transactionId) {
        this.logger.warn(`hash: anchoring '${hash}' as '${encoding}' resulted in no transaction id`);
        return null;
      }

      this.logger.debug(`hash: successfully anchored '${hash}' as '${encoding}' in transaction '${transactionId}'`);
      return this.asChainPoint(hash, transactionId);
    } catch (e) {
      this.logger.error(`hash: failed anchoring '${hash}' as '${encoding}'`);
      throw e;
    }
  }

  async getTransactionByHash(hash: string, encoding?: string): Promise<{
    '@context', type, targetHash, anchors,
  } | null> {
    const hashEncoded = encoding ? this.encoder.hexEncode(this.encoder.decode(hash, encoding)) : hash;
    const transaction = await this.storage.getAnchor(hashEncoded);
    let transactionId: string;

    if (transaction && transaction.id) {
      return this.asChainPoint(hash, transaction.id, transaction.blockHeight, transaction.position);
    } else {
      const encoded = this.encoder.base64Encode(this.encoder.decode(hash, 'hex'));
      transactionId = await this.getUnconfirmedAnchor(encoded);
    }

    if (!transactionId) {
      return null;
    }

    return this.asChainPoint(hash, transactionId);
  }

  async getTransactionsByAddress(
    address: string,
    type: 'anchor' | 'transfer',
    limit: number = 25,
    offset: number = 0,
  ): Promise<string[]> {
    return await this.storage.getTx(type, address, limit, offset);
  }

  async countTransactionsByAddress(
    address: string,
    type: 'anchor' | 'transfer',
  ): Promise<number> {
    return await this.storage.countTx(type, address);
  }

  asChainPoint(hash: string, transactionId: string, blockHeight?: number, position?: number) {
    const result = {
      '@context': 'https://w3id.org/chainpoint/v2',
      'type': 'ChainpointSHA256v2',
      'targetHash': hash,
      'anchors': [{
        type: 'LTODataTransaction',
        sourceId: transactionId,
      }],
    } as any;

    if (blockHeight) {
      result.block = {
        height: blockHeight,
      };
    }

    if (position) {
      result.transaction = {
        position,
      };
    }
    return result;
  }

  async getNodeStatus(): Promise<{ blockchainHeight, stateHeight, updatedTimestamp, updatedDate }> {
    const response = await this.api.getNodeStatus();

    if (response instanceof Error) {
      throw response;
    }

    return response.data;
  }

  async isNodeHealthy(): Promise<boolean> {
    try {
      const response = await this.getNodeStatus();
      return response && response.blockchainHeight;
    } catch (e) {
      // swallow error
      return false;
    }
  }

  async getNodeInfo(): Promise<{ status, address }> {
    const status = await this.getNodeStatus();
    const address = await this.getNodeWallet();

    return { status, address };
  }

  async getActivationStatus(): Promise<ActivationStatus> {
    const response = await this.api.getActivationStatus();

    if (response instanceof Error) {
      throw response;
    }

    return response.data;
  }
}
