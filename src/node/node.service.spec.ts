import { Test, TestingModule } from '@nestjs/testing';
import { NodeModuleConfig } from './node.module';
import { NodeService } from './node.service';
import { NodeApiService } from './node-api.service';
import { StorageService } from '../storage/storage.service';
import { AxiosResponse } from 'axios';

describe('NodeService', () => {
  let module: TestingModule;
  let nodeService: NodeService;
  let nodeApiService: NodeApiService;
  let storageService: StorageService;

  function spy() {
    const fakeTransaction = {
      id: 'fake_transaction',
      blockHeight: '1',
      position: '0',
    };

    const node = {
      getNodeWallet: jest.spyOn(nodeService, 'getNodeWallet'),
      createAnchorTransaction: jest.spyOn(nodeService, 'createAnchorTransaction'),
      getUnconfirmedAnchor: jest.spyOn(nodeService, 'getUnconfirmedAnchor'),
      getNodeStatus: jest.spyOn(nodeService, 'getNodeStatus'),
    };

    const storage = {
      getAnchor: jest.spyOn(storageService, 'getAnchor')
        .mockImplementation(() => Promise.resolve(fakeTransaction)),
    };

    const api = {
      getNodeAddresses: jest.spyOn(nodeApiService, 'getNodeAddresses'),
      getUnconfirmedTransactions: jest.spyOn(nodeApiService, 'getUnconfirmedTransactions'),
      getLastBlock: jest.spyOn(nodeApiService, 'getLastBlock'),
      getBlock: jest.spyOn(nodeApiService, 'getBlock'),
      getBlocks: jest.spyOn(nodeApiService, 'getBlocks'),
      sendTransaction: jest.spyOn(nodeApiService, 'sendTransaction'),
      getNodeStatus: jest.spyOn(nodeApiService, 'getNodeStatus'),
      getActivationStatus: jest.spyOn(nodeApiService, 'getActivationStatus'),
    };

    return { api, node, storage };
  }

  beforeEach(async () => {
    module = await Test.createTestingModule(NodeModuleConfig).compile();
    await module.init();

    nodeService = module.get<NodeService>(NodeService);
    nodeApiService = module.get<NodeApiService>(NodeApiService);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('getNodeWallet()', () => {
    test('should get the node wallet address', async () => {
      const spies = spy();

      const response = { status: 200, data: ['fake_address'] } as AxiosResponse;
      spies.api.getNodeAddresses.mockImplementation(() => Promise.resolve(response));

      expect(await nodeService.getNodeWallet()).toBe(response.data[0]);
      expect(spies.api.getNodeAddresses.mock.calls.length).toBe(1);
    });
  });

  describe('getUnconfirmedAnchor()', () => {
    test('should get the unconfirmed anchor', async () => {
      const spies = spy();

      const response = {
        status: 200,
        data: [{ id: 'fake_id', type: 12, data: [{ value: 'base64:fake_hash' }] }],
      } as AxiosResponse;
      spies.api.getUnconfirmedTransactions.mockImplementation(() => Promise.resolve(response));

      expect(await nodeService.getUnconfirmedAnchor('fake_hash')).toBe(response.data[0].id);
      expect(spies.api.getUnconfirmedTransactions.mock.calls.length).toBe(1);
    });
  });

  describe('getLastBlockHeight()', () => {
    test('should get last block height', async () => {
      const spies = spy();

      const response = { status: 200, data: { height: 1 } } as AxiosResponse;
      spies.api.getLastBlock.mockImplementation(() => Promise.resolve(response));

      expect(await nodeService.getLastBlockHeight()).toBe(response.data.height);
      expect(spies.api.getLastBlock.mock.calls.length).toBe(1);
    });
  });

  describe('getBlock()', () => {
    test('should get block by id', async () => {
      const spies = spy();

      const response = { status: 200, data: { id: 'fake_id' } } as AxiosResponse;
      spies.api.getBlock.mockImplementation(() => Promise.resolve(response));

      expect(await nodeService.getBlock('fake_id')).toBe(response.data);
      expect(spies.api.getBlock.mock.calls.length).toBe(1);
    });
  });

  describe('getBlocks()', () => {
    test('should get blocks by range', async () => {
      const spies = spy();

      const responses = [
        { status: 200, data: [{ height: 1 }, { height: 100 }] } as AxiosResponse,
        { status: 200, data: [{ height: 101 }, { height: 200 }] } as AxiosResponse,
        { status: 200, data: [{ height: 201 }, { height: 300 }] } as AxiosResponse,
        { status: 200, data: [{ height: 301 }, { height: 400 }] } as AxiosResponse,
        { status: 200, data: [{ height: 401 }, { height: 500 }] } as AxiosResponse,
        { status: 200, data: [{ height: 501 }, { height: 555 }] } as AxiosResponse,
      ];

      spies.api.getBlocks
        .mockImplementationOnce(() => Promise.resolve(responses[0]))
        .mockImplementationOnce(() => Promise.resolve(responses[1]))
        .mockImplementationOnce(() => Promise.resolve(responses[2]))
        .mockImplementationOnce(() => Promise.resolve(responses[3]))
        .mockImplementationOnce(() => Promise.resolve(responses[4]))
        .mockImplementationOnce(() => Promise.resolve(responses[5]));

      expect(await nodeService.getBlocks(1, 555)).toEqual([
        { height: 1 }, { height: 100 },
        { height: 101 }, { height: 200 },
        { height: 201 }, { height: 300 },
        { height: 301 }, { height: 400 },
        { height: 401 }, { height: 500 },
        { height: 501 }, { height: 555 },
      ]);
      expect(spies.api.getBlocks.mock.calls.length).toBe(6);
      expect(spies.api.getBlocks.mock.calls)
        .toEqual([[1, 100], [101, 200], [201, 300], [301, 400], [401, 500], [501, 555]]);
    });
  });

  describe('createAnchorTransaction()', () => {
    test('should create anchor transaction', async () => {
      const spies = spy();

      const response = { status: 200, data: { id: 'fake_id' } } as AxiosResponse;
      spies.api.sendTransaction.mockImplementation(() => Promise.resolve(response));

      expect(await nodeService.createAnchorTransaction('fake_sender', 'fake_hash')).toEqual('fake_id');
      expect(spies.api.sendTransaction.mock.calls.length).toBe(1);
    });
  });

  describe('anchor()', () => {
    test('should anchor hash with given encoding', async () => {
      const spies = spy();
      spies.node.getNodeWallet.mockImplementation(() => Promise.resolve('fake_wallet'));
      spies.node.createAnchorTransaction.mockImplementation(() => Promise.resolve('fake_transaction'));
      spies.node.getUnconfirmedAnchor.mockImplementation(() => Promise.resolve('fake_transaction'));

      const hash = '2C26B46B68FFC68FF99B453C1D30413413422D706483BFA0F98A5E886266E7AE';
      const encoding = 'hex';
      const chainpoint = {
        '@context': 'https://w3id.org/chainpoint/v2',
        'anchors': [
          {
            sourceId: 'fake_transaction',
            type: 'LTODataTransaction',
          },
        ],
        'targetHash': hash,
        'type': 'ChainpointSHA256v2',
      };

      expect(await nodeService.anchor(hash, encoding)).toEqual(chainpoint);

      expect(spies.node.getNodeWallet.mock.calls.length).toBe(1);
      expect(spies.node.createAnchorTransaction.mock.calls.length).toBe(1);
      expect(spies.node.createAnchorTransaction.mock.calls[0][0]).toBe('fake_wallet');
      expect(spies.node.createAnchorTransaction.mock.calls[0][1]).toBe('3yMApqCuCjXDWPrbjfR5mjCPTHqFG8Pux1TxQrEM35jj');
    });
  });

  describe('getTransactionByHash()', () => {
    test('should get transaction by hash', async () => {
      const spies = spy();
      spies.node.getUnconfirmedAnchor.mockImplementation(() => Promise.resolve('fake_transaction'));

      const hash = '2C26B46B68FFC68FF99B453C1D30413413422D706483BFA0F98A5E886266E7AE';
      const chainpoint = {
        '@context': 'https://w3id.org/chainpoint/v2',
        'anchors': [
          {
            sourceId: 'fake_transaction',
            type: 'LTODataTransaction',
          },
        ],
        'block': {
          height: '1',
        },
        'transaction': {
          position: '0',
        },
        'targetHash': hash,
        'type': 'ChainpointSHA256v2',
      };

      expect(await nodeService.getTransactionByHash(hash)).toEqual(chainpoint);

      expect(spies.storage.getAnchor.mock.calls.length).toBe(1);
      expect(spies.storage.getAnchor.mock.calls[0][0]).toBe(hash);

      expect(spies.node.getUnconfirmedAnchor.mock.calls.length).toBe(0);
    });

    test('should get transaction by hash by looking in unconfirmed transactions', async () => {
      const spies = spy();
      spies.node.getUnconfirmedAnchor.mockImplementation(() => Promise.resolve('fake_transaction'));

      spies.storage.getAnchor.mockImplementation(() => Promise.resolve({}));

      const hash = '2C26B46B68FFC68FF99B453C1D30413413422D706483BFA0F98A5E886266E7AE';
      const chainpoint = {
        '@context': 'https://w3id.org/chainpoint/v2',
        'anchors': [
          {
            sourceId: 'fake_transaction',
            type: 'LTODataTransaction',
          },
        ],
        'targetHash': hash,
        'type': 'ChainpointSHA256v2',
      };

      expect(await nodeService.getTransactionByHash(hash)).toEqual(chainpoint);

      expect(spies.storage.getAnchor.mock.calls.length).toBe(1);
      expect(spies.storage.getAnchor.mock.calls[0][0]).toBe(hash);

      expect(spies.node.getUnconfirmedAnchor.mock.calls.length).toBe(1);
      expect(spies.node.getUnconfirmedAnchor.mock.calls[0][0]).toBe('LCa0a2j/xo/5m0U8HTBBNBNCLXBkg7+g+YpeiGJm564=');
    });
  });

  describe('getNodeStatus()', () => {
    it('should return the status data is received', async () => {
      const spies = spy();
      const expectData = {
        status: {
          blockchainHeight: 1,
          stateHeight: 1,
          updatedTimestamp: 1549617037043,
          updatedDate: '2019-02-08T09:10:37.043Z',
        },
      };

      const response = { status: 200, data: expectData } as AxiosResponse;
      spies.api.getNodeStatus.mockImplementation(() =>  Promise.resolve(response));

      expect(await nodeService.getNodeStatus()).toEqual(expectData);
    });
  });

  describe('isNodeHealthy()', () => {
    it('should return true when the node is healthy', async () => {
      const spies = spy();
      const status = {
        blockchainHeight: 1,
        stateHeight: 1,
        updatedTimestamp: 1549617037043,
        updatedDate: '2019-02-08T09:10:37.043Z',
      };
      spies.node.getNodeStatus.mockImplementation(() =>  Promise.resolve(status));

      expect(await nodeService.isNodeHealthy()).toBeTruthy();
    });

    it('should return false when the node is not healthy', async () => {
      const spies = spy();
      spies.node.getNodeStatus.mockImplementation(() => { throw new Error(); });

      expect(await nodeService.isNodeHealthy()).toBeFalsy();
    });
  });

  describe('getNodeInfo()', () => {
    it('should return the status data is received', async () => {
      const status = {
        blockchainHeight: 1,
        stateHeight: 1,
        updatedTimestamp: 1549617037043,
        updatedDate: '2019-02-08T09:10:37.043Z',
      };

      const spies = spy();
      spies.node.getNodeStatus.mockImplementation(() => Promise.resolve(status));
      spies.node.getNodeWallet.mockImplementation(() => Promise.resolve('fake_address'));

      expect(await nodeService.getNodeInfo()).toEqual({
        status,
        address: 'fake_address',
      });
    });
  });

  describe('getActivationStatus()', async () => {
    test('should return activation status', async () => {
      const spies = spy();

      const mockResponse = {
        status: 200,
        data: {
          height: 1486819,
          votingInterval: 6000,
          votingThreshold: 4000,
          nextCheck: 1488000,
          features: [
            {
              id: 4,
              description: 'Smart Accounts',
              blockchainStatus: 'ACTIVATED',
              nodeStatus: 'IMPLEMENTED',
              activationHeight: 420000
            }
          ]
        }
      } as AxiosResponse;

      spies.api.getActivationStatus.mockImplementation(() => Promise.resolve(mockResponse));

      const result = await nodeService.getActivationStatus();

      expect(result).toBe(mockResponse.data);
      expect(spies.api.getActivationStatus.mock.calls.length).toBe(1);
    });
  });
});
