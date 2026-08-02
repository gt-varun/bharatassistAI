import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

vi.mock('../../services/ai/retrievalService.js', () => ({
  searchSchemes: vi.fn().mockResolvedValue({
    schemes: [
      {
        _id: '6a6f47304761a7d1fdb138ea',
        name: 'Karnataka Vidyasiri Scholarship',
        slug: 'karnataka-vidyasiri-scholarship',
        department: 'Department of Backward Classes Welfare',
        level: 'state',
        state: 'Karnataka',
        shortDescription: 'Post-matric scholarship',
        fullDescription: 'Full tuition reimbursement',
        targetSegments: ['student'],
        benefitType: 'cash',
        benefitSummary: '₹15,000 / year stipend',
        status: 'open',
        requiredDocuments: [],
        applicationFields: [],
        translations: {}
      }
    ],
    pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
  }),
  getCategoryCounts: vi.fn().mockResolvedValue({
    segments: { student: 5, farmer: 3 },
    benefitTypes: { cash: 4, loan: 2 },
    levels: { state: 4, central: 4 },
    states: { Karnataka: 4 }
  }),
  getSchemeBySlugOrId: vi.fn().mockImplementation(async (idOrSlug: string) => {
    if (idOrSlug === 'karnataka-vidyasiri-scholarship') {
      return {
        _id: '6a6f47304761a7d1fdb138ea',
        name: 'Karnataka Vidyasiri Scholarship',
        slug: 'karnataka-vidyasiri-scholarship',
        department: 'Department of Backward Classes Welfare',
        level: 'state',
        state: 'Karnataka',
        shortDescription: 'Post-matric scholarship',
        fullDescription: 'Full tuition reimbursement',
        targetSegments: ['student'],
        benefitType: 'cash',
        benefitSummary: '₹15,000 / year stipend',
        status: 'open',
        requiredDocuments: [],
        applicationFields: [],
        translations: {}
      };
    }
    return null;
  })
}));

describe('Schemes API Endpoints', () => {
  const app = createApp();

  it('GET /api/schemes returns paginated schemes list', async () => {
    const response = await request(app).get('/api/schemes');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/schemes/search accepts keyword and filter parameters', async () => {
    const response = await request(app).get('/api/schemes/search?q=student&level=state');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  it('GET /api/schemes/categories returns live category counts', async () => {
    const response = await request(app).get('/api/schemes/categories');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.segments).toBeDefined();
  });

  it('GET /api/schemes/:slug returns 404 for unknown slug', async () => {
    const response = await request(app).get('/api/schemes/unknown-nonexistent-scheme-slug');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('SCHEME_NOT_FOUND');
  });

  it('GET /api/schemes/:slug returns scheme for valid slug', async () => {
    const response = await request(app).get('/api/schemes/karnataka-vidyasiri-scholarship');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.slug).toBe('karnataka-vidyasiri-scholarship');
  });
});
