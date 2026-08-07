import { describe, it, expect } from 'vitest';
import { isValidGovDomain } from './govAllowlist.js';

describe('isValidGovDomain', () => {
  it('accepts real .gov.in and .nic.in portals', () => {
    expect(isValidGovDomain('https://pmkisan.gov.in')).toBe(true);
    expect(isValidGovDomain('https://nsap.nic.in/some/path')).toBe(true);
  });

  it('accepts the explicitly allow-listed non-.gov.in portals', () => {
    expect(isValidGovDomain('https://mudra.org.in')).toBe(true);
    expect(isValidGovDomain('https://pmkisan.gov.in/beneficiary')).toBe(true);
  });

  it('rejects a domain that merely contains "gov.in" as a substring', () => {
    expect(isValidGovDomain('https://not-really.gov.in.evil.com')).toBe(false);
  });

  it('rejects an unrelated commercial domain', () => {
    expect(isValidGovDomain('https://standupmitra.in')).toBe(false);
    expect(isValidGovDomain('https://example.com')).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    expect(isValidGovDomain('not a url')).toBe(false);
    expect(isValidGovDomain('')).toBe(false);
    expect(isValidGovDomain(null)).toBe(false);
    expect(isValidGovDomain(undefined)).toBe(false);
  });
});
