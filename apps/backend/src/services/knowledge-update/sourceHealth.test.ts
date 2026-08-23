import { describe, it, expect } from 'vitest';
import { toHealthReport } from './sourceHealth.js';

describe('toHealthReport', () => {
  it('reports 100% success for a source with no runs yet', () => {
    const report = toHealthReport({ sourceUrl: 'https://pmkisan.gov.in' });
    expect(report.successRate).toBe(1);
    expect(report.totalRuns).toBe(0);
  });

  it('computes the success rate from total runs and failures', () => {
    const report = toHealthReport({
      sourceUrl: 'https://pmkisan.gov.in',
      totalRuns: 10,
      totalFailures: 2
    });
    expect(report.successRate).toBe(0.8);
  });

  it('reports 0% for a source that has never once succeeded', () => {
    const report = toHealthReport({
      sourceUrl: 'https://flaky.example.com',
      totalRuns: 5,
      totalFailures: 5
    });
    expect(report.successRate).toBe(0);
  });

  it('carries consecutiveFailures and lastFetchMs through unchanged', () => {
    const report = toHealthReport({
      sourceUrl: 'https://pmkisan.gov.in',
      totalRuns: 3,
      totalFailures: 1,
      consecutiveFailures: 2,
      lastFetchMs: 512
    });
    expect(report.consecutiveFailures).toBe(2);
    expect(report.lastFetchMs).toBe(512);
  });

  it('normalises a missing lastSuccessAt to null rather than undefined', () => {
    const report = toHealthReport({ sourceUrl: 'https://pmkisan.gov.in' });
    expect(report.lastSuccessAt).toBeNull();
  });
});
