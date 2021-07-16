import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { IndexDocumentType } from '../index/model/index.model';
import { EncoderService } from '../encoder/encoder.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class AnchorService {
  public transactionTypes: Array<number>;
  public anchorToken: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly encoder: EncoderService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.transactionTypes = [12, 15];
    this.anchorToken = '\u2693';
  }

  async index(index: IndexDocumentType) {
    const { transaction, blockHeight, position } = index;
    const { sender } = transaction;

    const anchorIndexing = this.config.getAnchorIndexing();
    const senderRoles = await this.storage.getRolesFor(sender);
    const isSenderTrustNetwork = Object.keys(senderRoles).length === 0;

    if (anchorIndexing === 'none') {
      return;
    }

    if (this.transactionTypes.indexOf(transaction.type) === -1) {
      return;
    }

    if (anchorIndexing === 'trust' && isSenderTrustNetwork) {
      return;
    }

    // Process old data transactions
    if (transaction.type === 12 && !!transaction.data) {
      for (const item of transaction.data) {
        if (item.key === this.anchorToken) {
          const value = item.value.replace('base64:', '');
          const hexHash = this.encoder.hexEncode(
            this.encoder.base64Decode(value),
          );
          this.logger.debug(`anchor: save hash ${hexHash} with transaction ${transaction.id}`);
          await this.storage.saveAnchor(hexHash, {
            id: transaction.id,
            blockHeight,
            position,
          });
        }
      }
    } else if (transaction.type === 15 && !!transaction.anchors) {
      transaction.anchors.forEach(async anchor => {
        const hexHash = this.encoder.hexEncode(
          this.encoder.base58Decode(anchor),
        );
        this.logger.debug(`anchor: save hash ${hexHash} with transaction ${transaction.id}`);
        await this.storage.saveAnchor(hexHash, {
          id: transaction.id,
          blockHeight,
          position,
        });
      });
    }
  }
}
