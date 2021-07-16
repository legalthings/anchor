import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { NodeService, ActivationStatus } from '../node/node.service';
import { RequestService } from '../request/request.service';
import { StorageService } from '../storage/storage.service';
import { SupplyModuleConfig } from './supply.module';
import { SupplyService } from './supply.service';

describe('SupplyService', () => {
  let module: TestingModule;
  let nodeService: NodeService;
  let supplyService: SupplyService;
  let storageService: StorageService;
  let requestService: RequestService;

  beforeEach(async () => {
    module = await Test.createTestingModule(SupplyModuleConfig).compile();
    await module.init();

    nodeService = module.get<NodeService>(NodeService);
    supplyService = module.get<SupplyService>(SupplyService);
    storageService = module.get<StorageService>(StorageService);
    requestService = module.get<RequestService>(RequestService);

    // january 2021 = 294114776 (see locked-supply.data.json)
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2021-01-01T13:13:37.000Z').valueOf());
  });

  afterEach(async () => {
    await module.close();
  });

  describe('transaction fee burn', () => {
    describe('incrTxFeeBurned()', () => {
      let setTxFeeBurned: jest.SpyInstance<Promise<void>>;
      let getTxFeeBurned: jest.SpyInstance<Promise<number>>;
      let isFeatureActivated: jest.SpyInstance<Promise<boolean>>;

      beforeEach(() => {
        setTxFeeBurned = jest.spyOn(storageService, 'setTxFeeBurned').mockImplementation(async () => {});
        getTxFeeBurned = jest.spyOn(storageService, 'getTxFeeBurned').mockImplementation(async () => 10);
        isFeatureActivated = jest.spyOn(supplyService, 'isFeatureActivated').mockImplementation(async () => true);
      });

      test('should increase the tx fee burned index', async () => {  
        await supplyService.incrTxFeeBurned(5);
  
        expect(isFeatureActivated.mock.calls.length).toBe(1);

        expect(getTxFeeBurned.mock.calls.length).toBe(1);
        expect(setTxFeeBurned.mock.calls.length).toBe(1);
        expect(setTxFeeBurned.mock.calls[0][0]).toBe('10.1');
      });

      test('should not increase if feature is not activated', async () => {
        isFeatureActivated = jest.spyOn(supplyService, 'isFeatureActivated').mockImplementation(async () => false);

        await supplyService.incrTxFeeBurned(5);
  
        expect(getTxFeeBurned.mock.calls.length).toBe(0);
        expect(setTxFeeBurned.mock.calls.length).toBe(0);
      });
    });

    describe('getTxFeeBurned()', () => {
      test('should return the transaction fee burned from storage', async () => {
        const getTxFeeBurned = jest.spyOn(storageService, 'getTxFeeBurned').mockImplementation(async () => 10);

        const result = await supplyService.getTxFeeBurned();

        expect(getTxFeeBurned.mock.calls.length).toBe(1);

        expect(result).toBe(10);
      });
    });

    describe('getFeeBurnFeatureHeight()', () => {
      test('should return the fee burn feature height from storage', async () => {
        const getFeeBurnFeatureHeight = jest.spyOn(storageService, 'getFeeBurnFeatureHeight').mockImplementation(async () => 10);

        const result = await supplyService.getFeeBurnFeatureHeight();

        expect(getFeeBurnFeatureHeight.mock.calls.length).toBe(1);

        expect(result).toBe(10);
      });
    });

    describe('isFeatureActivated()', () => {
      describe('feature height already indexed', () => {
        test('should use indexed feature height if present', async () => {
          const getFeeBurnFeatureHeight = jest.spyOn(storageService, 'getFeeBurnFeatureHeight').mockImplementation(async () => 10);
          const getActivationStatus = jest.spyOn(nodeService, 'getActivationStatus');
  
          const result = await supplyService.isFeatureActivated(15);
  
          expect(getActivationStatus.mock.calls.length).toBe(0);
          expect(getFeeBurnFeatureHeight.mock.calls.length).toBe(1);
  
          expect(result).toBe(true);
        });

        test('should return false if block height is lower than feature activation', async () => {
          jest.spyOn(storageService, 'getFeeBurnFeatureHeight').mockImplementation(async () => 10);
  
          const result = await supplyService.isFeatureActivated(5);
  
          expect(result).toBe(false);
        });
      });

      describe('feature height not indexed', () => {
        let setFeeBurnFeatureHeight: jest.SpyInstance<Promise<void>>;
        let getActivationStatus: jest.SpyInstance<Promise<ActivationStatus>>;

        beforeEach(() => {
          jest.spyOn(storageService, 'getFeeBurnFeatureHeight').mockRejectedValue(async () => {});
          setFeeBurnFeatureHeight = jest.spyOn(storageService, 'setFeeBurnFeatureHeight').mockImplementation(async () => {});
          getActivationStatus = jest.spyOn(nodeService, 'getActivationStatus').mockImplementation(async () => {
            return { features: [{ id: 12, activationHeight: 10 }] } as ActivationStatus;
          });
        });

        test('should query for feature height if not indexed and save it', async () => {
          const result = await supplyService.isFeatureActivated(15);

          expect(getActivationStatus.mock.calls.length).toBe(1);
          expect(setFeeBurnFeatureHeight.mock.calls.length).toBe(1);
          expect(result).toBe(true);
        });

        test('should return false if burn feature was not found (feature.id != 12)', async () => {
          getActivationStatus = jest.spyOn(nodeService, 'getActivationStatus').mockImplementation(async () => {
            return { features: [{ id: 10, activationHeight: 10 }] } as ActivationStatus;
          });

          const result = await supplyService.isFeatureActivated(15);

          expect(result).toBe(false);
        });

        test('should return false if activation status was not found', async () => {
          getActivationStatus = jest.spyOn(nodeService, 'getActivationStatus').mockRejectedValue(async () => {});

          const result = await supplyService.isFeatureActivated(15);

          expect(result).toBe(false);
        });

        test('should return false if burn feature does not have activation height', async () => {
          getActivationStatus = jest.spyOn(nodeService, 'getActivationStatus').mockImplementation(async () => {
            return { features: [{ id: 12 }] } as ActivationStatus;
          });

          const result = await supplyService.isFeatureActivated(15);

          expect(result).toBe(false);
        });

        test('should return false if block height is lower than feature activation', async () => {
          const result = await supplyService.isFeatureActivated(5);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe('getCirculatingSupply()', () => {
    let getTxFeeBurned: jest.SpyInstance<Promise<number>>;
    let httpGet: jest.SpyInstance<Promise<AxiosResponse | Error>>;

    beforeEach(() => {
      getTxFeeBurned = jest.spyOn(storageService, 'getTxFeeBurned').mockImplementation(async () => 5);
      httpGet = jest.spyOn(requestService, 'get').mockImplementation(async () => {
        return {
          data: {
            volume: {
              lto: { supply: 500000000, burned: 100000000 },
              lto20: { supply: 100000000, burned: 50000000 }
            }
          }
        } as AxiosResponse;
      });
    });

    test('should calculate the result correctly with 8 decimal places', async () => {
      const result = await supplyService.getCirculatingSupply();

      expect(httpGet.mock.calls.length).toBe(1);
      expect(httpGet.mock.calls[0][0]).toBe('https://bridge.lto.network/stats');

      expect(getTxFeeBurned.mock.calls.length).toBe(1);

      expect(result).toBe('155885219.00000000');
    });

    test('should reject if bridge stats request fails', async () => {
      httpGet = jest.spyOn(requestService, 'get').mockRejectedValue('some error');

      await supplyService.getCirculatingSupply().catch(error => {
        expect(error).toBe('some error');
      });
    });
  });

  describe('getMaxSupply()', () => {
    let httpGet: jest.SpyInstance<Promise<AxiosResponse | Error>>;

    beforeEach(() => {
      httpGet = jest.spyOn(requestService, 'get').mockImplementation(async () => {
        return {
          data: {
            volume: {
              lto: { supply: 500000000, burned: 100000000 },
              lto20: { supply: 100000000, burned: 50000000 }
            }
          }
        } as AxiosResponse;
      });
    });

    test('should calculate the result correctly with 8 decimal places', async () => {
      const result = await supplyService.getMaxSupply();

      expect(httpGet.mock.calls.length).toBe(1);
      expect(httpGet.mock.calls[0][0]).toBe('https://bridge.lto.network/stats');

      expect(result).toBe('600000000.00000000');
    });

    test('should reject if bridge stats request fails', async () => {
      httpGet = jest.spyOn(requestService, 'get').mockRejectedValue('some error');

      await supplyService.getMaxSupply().catch(error => {
        expect(error).toBe('some error');
      });
    });
  });
});
