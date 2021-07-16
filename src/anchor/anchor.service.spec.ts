import { Test, TestingModule } from '@nestjs/testing';
import { AnchorModuleConfig } from './anchor.module';
import { AnchorService } from './anchor.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '../config/config.service';

describe('AnchorService', () => {
  let module: TestingModule;
  let anchorService: AnchorService;
  let configService: ConfigService;
  let storageService: StorageService;

  function spy() {
    const storage = {
      saveAnchor: jest.spyOn(storageService, 'saveAnchor').mockImplementation(async () => { }),
      getRolesFor: jest.spyOn(storageService, 'getRolesFor').mockImplementation(async () => { return {} }),
    };

    const config = {
      getAnchorIndexing: jest.spyOn(configService, 'getAnchorIndexing').mockImplementation(() => 'all'),
    };

    return { storage, config };
  }

  beforeEach(async () => {
    module = await Test.createTestingModule(AnchorModuleConfig).compile();
    await module.init();

    anchorService = module.get<AnchorService>(AnchorService);
    configService = module.get<ConfigService>(ConfigService);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('index', () => {

    test('should process the data transaction', async () => {
      const spies = spy();

      const transaction = {
        id: 'fake_transaction',
        type: 12,
        data: [
          {
            key: anchorService.anchorToken,
            value: 'base64:LGeJmzGkBiCwdgA1cgqcq9f0FMbaPbVhRhseSP4mywg',
          },
          {
            key: 'invalid key',
            value: 'base64:LGeJmzGkBiCwdgA1cgqcq9f0FMbaPbVhRhseSP4mywga',
          },
        ],
      };
      await anchorService.index({transaction: transaction as any, blockHeight: 1, position: 0});

      expect(spies.storage.saveAnchor.mock.calls.length).toBe(1);
      expect(spies.storage.saveAnchor.mock.calls[0][0])
        .toBe('2c67899b31a40620b0760035720a9cabd7f414c6da3db561461b1e48fe26cb08');
      expect(spies.storage.saveAnchor.mock.calls[0][1])
        .toMatchObject({ id: 'fake_transaction', blockHeight: 1, position: 0 });
    });

    test('should process the anchor transaction', async () => {
      const spies = spy();

      const transaction = {
        id: 'fake_transaction',
        type: 15,
        anchors: [
          '3zLWTHPNkmDsCRi2kZqFXFSBnTYykz13gHLezU4p6zmu',
        ],
      };
      await anchorService.index({transaction: transaction as any, blockHeight: 1, position: 0});

      expect(spies.storage.saveAnchor.mock.calls.length).toBe(1);
      expect(spies.storage.saveAnchor.mock.calls[0][0])
        .toBe('2c67899b31a40620b0760035720a9cabd7f414c6da3db561461b1e48fe26cb08');
      expect(spies.storage.saveAnchor.mock.calls[0][1])
        .toMatchObject({ id: 'fake_transaction', blockHeight: 1, position: 0 });
    });

    test('should not process when config says "none"', async () => {
      const spies = spy();

      spies.config.getAnchorIndexing = jest.spyOn(configService, 'getAnchorIndexing').mockImplementation(() => 'none');

      const transaction = {
        id: 'fake_transaction',
        type: 15,
        anchors: [
          '3zLWTHPNkmDsCRi2kZqFXFSBnTYykz13gHLezU4p6zmu',
        ],
      };

      await anchorService.index({transaction: transaction as any, blockHeight: 1, position: 0});

      expect(spies.storage.saveAnchor.mock.calls.length).toBe(0);
    });

    test('should only process "trust" anchors when configured', async () => {
      const spies = spy();

      spies.config.getAnchorIndexing = jest.spyOn(configService, 'getAnchorIndexing').mockImplementation(() => 'trust');
      spies.storage.getRolesFor = jest.spyOn(storageService, 'getRolesFor').mockImplementation(async (address: string) => {
        if (address === '3Mv7ajrPLKewkBNqfxwRZoRwW6fziehp7dQ') {
          return { root: { description: 'The root role' } };
        }

        return {};
      });

      const transaction = {
        id: 'fake_transaction',
        type: 15,
        sender: '3JuijVBB7NCwCz2Ae5HhCDsqCXzeBLRTyeL',
        anchors: [
          '3zLWTHPNkmDsCRi2kZqFXFSBnTYykz13gHLezU4p6zmu',
        ],
      };

      await anchorService.index({transaction: transaction as any, blockHeight: 1, position: 0});

      transaction.id = 'second_fake_transaction';
      transaction.sender = '3Mv7ajrPLKewkBNqfxwRZoRwW6fziehp7dQ';

      await anchorService.index({transaction: transaction as any, blockHeight: 2, position: 1});

      expect(spies.storage.saveAnchor.mock.calls.length).toBe(1);
    });
  });
});
