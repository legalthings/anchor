import { Test, TestingModule } from '@nestjs/testing';
import { NodeService } from '../node/node.service';
import { StorageService } from '../storage/storage.service';
import { IndexMonitorService } from './index-monitor.service';
import { IndexService } from './index.service';
import { IndexModuleConfig } from './index.module';

describe('IndexMonitorService', () => {
  let module: TestingModule;
  let monitorService: IndexMonitorService;
  let storageService: StorageService;
  let indexerService: IndexService;
  let nodeService: NodeService;

  function spy() {
    const monitor = {
      process: jest.spyOn(monitorService, 'process'),
      checkNewBlocks: jest.spyOn(monitorService, 'checkNewBlocks'),
      processBlock: jest.spyOn(monitorService, 'processBlock'),
      processTransaction: jest.spyOn(monitorService, 'processTransaction'),
    };
    const node = {
      getLastBlockHeight: jest.spyOn(nodeService, 'getLastBlockHeight')
        .mockImplementation(async () => 100),
      getBlock: jest.spyOn(nodeService, 'getBlock')
        .mockImplementation(async () => ({ height: 100, transactions: [], timestamp: 123 })),
      getBlocks: jest.spyOn(nodeService, 'getBlocks')
        .mockImplementation(async () => ([{ height: 100, transactions: [] }])),
      getNodeStatus: jest.spyOn(nodeService, 'getNodeStatus'),
    };
    const storage = {
      getProcessingHeight: jest.spyOn(storageService, 'getProcessingHeight')
        .mockImplementation(async () => 99),
      saveProcessingHeight: jest.spyOn(storageService, 'saveProcessingHeight')
        .mockImplementation(),
      saveAnchor: jest.spyOn(storageService, 'saveAnchor')
        .mockImplementation(),
    };
    const indexer = {
      index: jest.spyOn(indexerService, 'index')
        .mockImplementation(async () => true),
    };

    return { monitor, node, storage, indexer };
  }

  beforeEach(async () => {
    module = await Test.createTestingModule(IndexModuleConfig).compile();
    await module.init();

    monitorService = module.get<IndexMonitorService>(IndexMonitorService);
    storageService = module.get<StorageService>(StorageService);
    indexerService = module.get<IndexService>(IndexService);
    nodeService = module.get<NodeService>(NodeService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('start()', () => {
    test('should start the monitor', async () => {
      const spies = spy();
      spies.monitor.process.mockImplementation();

      await monitorService.start();

      expect(spies.monitor.process.mock.calls.length).toBe(1);
    });
  });

  describe('isSynced()', () => {
    test('should return false if the node is down', async () => {
      const spies = spy();
      spies.node.getNodeStatus.mockImplementation(() => { throw new Error(); });

      expect(await monitorService.isSynced()).toBeFalsy();
    });

    test('should return false if processing height is lower then the node height', async () => {
      const status = {
        blockchainHeight: 101,
        stateHeight: 1,
        updatedTimestamp: 1549617037043,
        updatedDate: '2019-02-08T09:10:37.043Z',
      };

      const spies = spy();
      spies.node.getNodeStatus.mockImplementation(() => Promise.resolve(status));

      expect(await monitorService.isSynced()).toBeFalsy();
      expect(spies.storage.getProcessingHeight.mock.calls.length).toBe(1);
    });

    test('should return true if processing height is equal to the node height', async () => {
      const status = {
        blockchainHeight: 99,
        stateHeight: 1,
        updatedTimestamp: 1549617037043,
        updatedDate: '2019-02-08T09:10:37.043Z',
      };

      const spies = spy();
      spies.node.getNodeStatus.mockImplementation(() => Promise.resolve(status));

      expect(await monitorService.isSynced()).toBeTruthy();
      expect(spies.storage.getProcessingHeight.mock.calls.length).toBe(1);
    });

    test('should return true if processing height is higher then the node height', async () => {
      const status = {
        blockchainHeight: 98,
        stateHeight: 1,
        updatedTimestamp: 1549617037043,
        updatedDate: '2019-02-08T09:10:37.043Z',
      };

      const spies = spy();
      spies.node.getNodeStatus.mockImplementation(() => Promise.resolve(status));

      expect(await monitorService.isSynced()).toBeTruthy();
      expect(spies.storage.getProcessingHeight.mock.calls.length).toBe(1);
    });
  });

  describe('checkNewBlocks()', () => {
    test('should check the new blocks', async () => {
      const spies = spy();
      spies.monitor.processBlock.mockImplementation();

      await monitorService.checkNewBlocks();

      expect(spies.monitor.processBlock.mock.calls.length).toBe(1);
      expect(spies.monitor.processBlock.mock.calls[0][0]).toEqual({ height: 100, transactions: [] });

      expect(spies.node.getLastBlockHeight.mock.calls.length).toBe(1);
      expect(spies.node.getBlock.mock.calls.length).toBe(0);
      expect(spies.node.getBlocks.mock.calls.length).toBe(1);
      expect(spies.node.getBlocks.mock.calls[0][0]).toEqual(99);
      expect(spies.node.getBlocks.mock.calls[0][1]).toEqual(100);

      expect(spies.storage.getProcessingHeight.mock.calls.length).toBe(1);
      expect(spies.storage.saveProcessingHeight.mock.calls.length).toBe(1);
      expect(spies.storage.saveProcessingHeight.mock.calls[0][0]).toBe(100);
    });
  });

  describe('processBlock()', () => {
    test('should process the block', async () => {
      const spies = spy();
      spies.monitor.processTransaction.mockImplementation();

      const block = {
        height: 100, transactions: [
          { id: 1 },
          { id: 2 },
        ],
      };
      await monitorService.processBlock(block as any);

      expect(spies.monitor.processTransaction.mock.calls.length).toBe(2);
      expect(spies.monitor.processTransaction.mock.calls[0][0]).toEqual(block.transactions[0]);
      expect(spies.monitor.processTransaction.mock.calls[1][0]).toEqual(block.transactions[1]);
    });
  });

  describe('processTransaction()', () => {
    test('should process the anchor transaction', async () => {
      const spies = spy();

      const transaction = {
        id: 'fake_transaction',
        type: 15,
        anchors: [
          '3zLWTHPNkmDsCRi2kZqFXFSBnTYykz13gHLezU4p6zmu',
        ],
      };
      await monitorService.processTransaction(transaction as any, 1, 0);

      expect(spies.indexer.index.mock.calls.length).toBe(1);
      expect(spies.indexer.index.mock.calls[0][0]).toEqual({transaction, blockHeight: 1, position: 0});
    });
  });
});
