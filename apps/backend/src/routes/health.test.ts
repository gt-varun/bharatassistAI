import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Health Check Endpoint', () => {
  it('GET /api/health returns status and service information', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.services).toBeDefined();
    expect(response.body.data.services.database).toBeDefined();
    expect(response.body.data.services.geminiApi).toBeDefined();
  });
});
