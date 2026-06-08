import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, afterAll, beforeAll } from '@jest/globals';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';

describe('Health route', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'gtcs-api',
    });
  });
});
