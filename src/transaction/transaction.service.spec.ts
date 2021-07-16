import { Test, TestingModule } from '@nestjs/testing';
import { TransactionModuleConfig } from './transaction.module';
import { TransactionService } from './transaction.service';
import { StorageService } from '../storage/storage.service';
import { SupplyService } from '../supply/supply.service';

describe('TransactionService', () => {
  let module: TestingModule;
  let transactionService: TransactionService;
  let storageService: StorageService;
  let supplyService: SupplyService;

  function spy() {
    const storage = {
      indexTx: jest.spyOn(storageService, 'indexTx').mockImplementation(async () => {}),
      incrTxStats: jest.spyOn(storageService, 'incrTxStats').mockImplementation(async () => {}),
    };

    const supply = {
      incrTxFeeBurned: jest.spyOn(supplyService, 'incrTxFeeBurned').mockImplementation(async () => {}),
    }

    return { storage, supply };
  }

  beforeEach(async () => {
    module = await Test.createTestingModule(TransactionModuleConfig).compile();
    await module.init();

    transactionService = module.get<TransactionService>(TransactionService);
    storageService = module.get<StorageService>(StorageService);
    supplyService = module.get<SupplyService>(SupplyService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('getAllTypes()', () => {
    test('get all transaction types', async () => {
      expect(transactionService.getAllTypes()).toEqual([
        { id: 'anchor', types: [12, 15] },
        { id: 'transfer', types: [4] },
        { id: 'mass_transfer', types: [11] },
        { id: 'all_transfers', types: [4, 11] },
        { id: 'start_lease', types: [8] },
        { id: 'cancel_lease', types: [9] },
        { id: 'lease', types: [8, 9] },
        { id: 'association', types: [16, 17] },
        { id: 'script', types: [13] },
        { id: 'sponsor', types: [18, 19] },
        { id: 'all', types: [1, 4, 8, 9, 11, 12, 13, 15, 16, 17, 18, 19] },
      ]);
    });
  });

  describe('getIdentifiers()', () => {
    test('get identifiers of all transaction types', async () => {
      expect(transactionService.getIdentifiers())
        .toEqual([
          'anchor',
          'transfer',
          'mass_transfer',
          'all_transfers',
          'start_lease',
          'cancel_lease',
          'lease',
          'association',
          'script',
          'sponsor',
          'all',
        ]);
    });
  });

  describe('getIdentifierByType()', () => {
    test('get identifier by type', async () => {
      expect(transactionService.getIdentifierByType(4)).toBe('transfer');
      expect(transactionService.getIdentifierByType(8)).toBe('start_lease');
      expect(transactionService.getIdentifierByType(9)).toBe('cancel_lease');
      expect(transactionService.getIdentifierByType(11)).toBe('mass_transfer');
      expect(transactionService.getIdentifierByType(12)).toBe('anchor');
      expect(transactionService.getIdentifierByType(15)).toBe('anchor');
      expect(transactionService.getIdentifierByType(99)).toBe(null);
    });
  });

  describe('hasIdentifier()', () => {
    test('check if transaction type with identifier exists', async () => {
      expect(transactionService.hasIdentifier('anchor')).toBe(true);
      expect(transactionService.hasIdentifier('transfer')).toBe(true);
      expect(transactionService.hasIdentifier('mass_transfer')).toBe(true);
      expect(transactionService.hasIdentifier('all_transfers')).toBe(true);
      expect(transactionService.hasIdentifier('start_lease')).toBe(true);
      expect(transactionService.hasIdentifier('cancel_lease')).toBe(true);
      expect(transactionService.hasIdentifier('lease')).toBe(true);
      expect(transactionService.hasIdentifier('association')).toBe(true);
      expect(transactionService.hasIdentifier('script')).toBe(true);
      expect(transactionService.hasIdentifier('sponsor')).toBe(true);
      expect(transactionService.hasIdentifier('all')).toBe(true);

      expect(transactionService.hasIdentifier('foo')).toBe(false);
    });
  });

  describe('index', () => {

    test('should index the transfer transaction', async () => {
      const spies = spy();

      const transaction = {
        id: 'fake_transaction',
        type: 4,
        sender: 'fake_sender',
        recipient: 'fake_recipient',
        timestamp: 1615371048483,
      };

      await transactionService.index({transaction: transaction as any, blockHeight: 1, position: 0});

      expect(spies.storage.incrTxStats.mock.calls.length).toBe(3);

      expect(spies.storage.incrTxStats.mock.calls[0][0]).toBe('transfer');
      expect(spies.storage.incrTxStats.mock.calls[0][1]).toBe(18696);

      expect(spies.storage.incrTxStats.mock.calls[1][0]).toBe('all_transfers');
      expect(spies.storage.incrTxStats.mock.calls[1][1]).toBe(18696);

      expect(spies.storage.incrTxStats.mock.calls[2][0]).toBe('all');
      expect(spies.storage.incrTxStats.mock.calls[2][1]).toBe(18696);

      expect(spies.supply.incrTxFeeBurned.mock.calls.length).toBe(3);

      expect(spies.supply.incrTxFeeBurned.mock.calls[0][0]).toBe(1);

      expect(spies.storage.indexTx.mock.calls.length).toBe(6);

      expect(spies.storage.indexTx.mock.calls[0][0]).toBe('transfer');
      expect(spies.storage.indexTx.mock.calls[0][1]).toBe(transaction.sender);
      expect(spies.storage.indexTx.mock.calls[0][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[1][0]).toBe('transfer');
      expect(spies.storage.indexTx.mock.calls[1][1]).toBe(transaction.recipient);
      expect(spies.storage.indexTx.mock.calls[1][2]).toBe(transaction.id);

      expect(spies.storage.indexTx.mock.calls[2][0]).toBe('all_transfers');
      expect(spies.storage.indexTx.mock.calls[2][1]).toBe(transaction.sender);
      expect(spies.storage.indexTx.mock.calls[2][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[3][0]).toBe('all_transfers');
      expect(spies.storage.indexTx.mock.calls[3][1]).toBe(transaction.recipient);
      expect(spies.storage.indexTx.mock.calls[3][2]).toBe(transaction.id);

      expect(spies.storage.indexTx.mock.calls[4][0]).toBe('all');
      expect(spies.storage.indexTx.mock.calls[4][1]).toBe(transaction.sender);
      expect(spies.storage.indexTx.mock.calls[4][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[5][0]).toBe('all');
      expect(spies.storage.indexTx.mock.calls[5][1]).toBe(transaction.recipient);
      expect(spies.storage.indexTx.mock.calls[5][2]).toBe(transaction.id);
    });

    test('should index the mass transfer transaction', async () => {
      const spies = spy();

      const transaction = {
        id: 'fake_transaction',
        type: 11,
        sender: 'fake_sender',
        recipient: 'fake_recipient',
        transfers: [
          { recipient: 'fake_transfer_1' },
          { recipient: 'fake_transfer_2' },
        ],
        timestamp: 1615371049542,
      };

      await transactionService.index({transaction: transaction as any, blockHeight: 1, position: 0});

      expect(spies.storage.incrTxStats.mock.calls.length).toBe(3);
      
      expect(spies.storage.incrTxStats.mock.calls[0][0]).toBe('mass_transfer');
      expect(spies.storage.incrTxStats.mock.calls[0][1]).toBe(18696);
      
      expect(spies.storage.incrTxStats.mock.calls[1][0]).toBe('all_transfers');
      expect(spies.storage.incrTxStats.mock.calls[1][1]).toBe(18696);
      
      expect(spies.storage.incrTxStats.mock.calls[2][0]).toBe('all');
      expect(spies.storage.incrTxStats.mock.calls[2][1]).toBe(18696);
      
      expect(spies.supply.incrTxFeeBurned.mock.calls.length).toBe(3);

      expect(spies.supply.incrTxFeeBurned.mock.calls[0][0]).toBe(1);

      expect(spies.storage.indexTx.mock.calls.length).toBe(12);

      expect(spies.storage.indexTx.mock.calls[0][0]).toBe('mass_transfer');
      expect(spies.storage.indexTx.mock.calls[0][1]).toBe(transaction.sender);
      expect(spies.storage.indexTx.mock.calls[0][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[1][0]).toBe('mass_transfer');
      expect(spies.storage.indexTx.mock.calls[1][1]).toBe(transaction.recipient);
      expect(spies.storage.indexTx.mock.calls[1][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[2][0]).toBe('mass_transfer');
      expect(spies.storage.indexTx.mock.calls[2][1]).toBe(transaction.transfers[0].recipient);
      expect(spies.storage.indexTx.mock.calls[2][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[3][0]).toBe('mass_transfer');
      expect(spies.storage.indexTx.mock.calls[3][1]).toBe(transaction.transfers[1].recipient);
      expect(spies.storage.indexTx.mock.calls[3][2]).toBe(transaction.id);

      expect(spies.storage.indexTx.mock.calls[4][0]).toBe('all_transfers');
      expect(spies.storage.indexTx.mock.calls[4][1]).toBe(transaction.sender);
      expect(spies.storage.indexTx.mock.calls[4][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[5][0]).toBe('all_transfers');
      expect(spies.storage.indexTx.mock.calls[5][1]).toBe(transaction.recipient);
      expect(spies.storage.indexTx.mock.calls[5][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[6][0]).toBe('all_transfers');
      expect(spies.storage.indexTx.mock.calls[6][1]).toBe(transaction.transfers[0].recipient);
      expect(spies.storage.indexTx.mock.calls[6][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[7][0]).toBe('all_transfers');
      expect(spies.storage.indexTx.mock.calls[7][1]).toBe(transaction.transfers[1].recipient);
      expect(spies.storage.indexTx.mock.calls[7][2]).toBe(transaction.id);

      expect(spies.storage.indexTx.mock.calls[8][0]).toBe('all');
      expect(spies.storage.indexTx.mock.calls[8][1]).toBe(transaction.sender);
      expect(spies.storage.indexTx.mock.calls[8][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[9][0]).toBe('all');
      expect(spies.storage.indexTx.mock.calls[9][1]).toBe(transaction.recipient);
      expect(spies.storage.indexTx.mock.calls[9][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[10][0]).toBe('all');
      expect(spies.storage.indexTx.mock.calls[10][1]).toBe(transaction.transfers[0].recipient);
      expect(spies.storage.indexTx.mock.calls[10][2]).toBe(transaction.id);
      expect(spies.storage.indexTx.mock.calls[11][0]).toBe('all');
      expect(spies.storage.indexTx.mock.calls[11][1]).toBe(transaction.transfers[1].recipient);
      expect(spies.storage.indexTx.mock.calls[11][2]).toBe(transaction.id);
    });
  });
});
