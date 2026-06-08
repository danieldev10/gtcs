import { describe, expect, it } from '@jest/globals';
import { HealthController } from './health.controller';

describe(HealthController, () => {
  it('returns API health status', () => {
    const response = new HealthController().getHealth();

    expect(response).toMatchObject({
      status: 'ok',
      service: 'gtcs-api',
    });
    expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
  });
});
