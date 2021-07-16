import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { IndexDocumentType } from '../index/model/index.model';
import { StorageService } from '../storage/storage.service';
import { VerificationMethod } from './model/verification-method.model';

@Injectable()
export class VerificationMethodService {

  constructor(
    private readonly logger: LoggerService,
    private readonly storage: StorageService,
  ) {
  }

  async index(index: IndexDocumentType): Promise<void> {
    const { transaction } = index;
    const { id, sender, party } = transaction;

    if (!party) {
      this.logger.debug(`verificationMethod: transaction ${id} didn't have a party address, skipped indexing`);
      return;
    }

    const verificationMethod = new VerificationMethod(transaction.associationType, transaction.sender, transaction.party, Math.floor((+new Date()) / 1000));
    
    this.logger.debug(`verificationMethod: address ${sender} has verification method ${verificationMethod.asString()}`);
    return this.storage.saveVerificationMethod(sender, verificationMethod);
  }
  
  async getMethodsFor(address: string): Promise<VerificationMethod[]> {
    return this.storage.getVerificationMethods(address);
  }

  async revoke(verificationMethod: VerificationMethod): Promise<void> {
    verificationMethod.revokedAt = Math.floor((+new Date()) / 1000);

    return this.storage.saveVerificationMethod(verificationMethod.sender, verificationMethod);
  }
}
