import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SupplyModuleConfig } from './supply.module';
import { SupplyService } from './supply.service';

describe('SupplyController', () => {
  let module: TestingModule;
  let supplyService: SupplyService;
  let app: INestApplication;

  function spy() {
    const supply = {
      getMaxSupply: jest.spyOn(supplyService, 'getMaxSupply').mockImplementation(async () => '87654321.87654321'),
      getCirculatingSupply: jest.spyOn(supplyService, 'getCirculatingSupply').mockImplementation(async () => '12345678.12345678'),
    };

    return { supply };
  }

  beforeEach(async () => {
    module = await Test.createTestingModule(SupplyModuleConfig).compile();
    app = module.createNestApplication();
    await app.init();

    supplyService = module.get<SupplyService>(SupplyService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('GET /circulating/', () => {
    test('should return the result', async () => {
      const spies = spy();

      const res = await request(app.getHttpServer())
        .get(`/supply/circulating`)
        .send();

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/json; charset=utf-8');
      expect(res.body).toEqual({ circulatingSupply: '12345678.12345678' });

      expect(spies.supply.getCirculatingSupply.mock.calls.length).toBe(1);
    });

    test('should return the raw result if parameter is given', async () => {
      const spies = spy();

      const res = await request(app.getHttpServer())
        .get(`/supply/circulating?output=raw`)
        .send();

      expect(res.header['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.text).toBe('12345678.12345678');
    });

    test('should return 500 if the service fails', async () => {
      const spies = spy();

      spies.supply.getCirculatingSupply.mockRejectedValue('some error');

      const res = await request(app.getHttpServer())
        .get(`/supply/circulating`)
        .send();

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'failed to get circulating supply: some error' });
    });
  });

  describe('GET /max/', () => {
    test('should return the result', async () => {
      const spies = spy();

      const res = await request(app.getHttpServer())
        .get(`/supply/max`)
        .send();

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/json; charset=utf-8');
      expect(res.body).toEqual({ maxSupply: '87654321.87654321' });

      expect(spies.supply.getMaxSupply.mock.calls.length).toBe(1);
    });

    test('should return the raw result if parameter is given', async () => {
      const spies = spy();

      const res = await request(app.getHttpServer())
        .get(`/supply/max?output=raw`)
        .send();

      expect(res.header['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.text).toBe('87654321.87654321');
    });

    test('should return 500 if the service fails', async () => {
      const spies = spy();

      spies.supply.getMaxSupply.mockRejectedValue('some error');

      const res = await request(app.getHttpServer())
        .get(`/supply/max`)
        .send();

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'failed to get max supply: some error' });
    });
  });
});