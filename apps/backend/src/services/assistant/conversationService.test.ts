import { describe, it, expect } from 'vitest';
import { buildProfileContext } from './conversationService.js';

describe('buildProfileContext', () => {
  it('returns null for a missing profile', () => {
    expect(buildProfileContext(null)).toBeNull();
    expect(buildProfileContext(undefined)).toBeNull();
  });

  it('returns null for a profile with no usable fields', () => {
    expect(buildProfileContext({})).toBeNull();
  });

  it('summarises the fields that are present', () => {
    const context = buildProfileContext({ state: 'Karnataka', occupationCategory: 'farmer', age: 45 });
    expect(context).toContain('state: Karnataka');
    expect(context).toContain('occupation: farmer');
    expect(context).toContain('age: 45');
  });

  it('never omits the constraint that this is for phrasing only, not eligibility', () => {
    const context = buildProfileContext({ state: 'Karnataka' });
    expect(context).toMatch(/never.*declare eligibility/i);
  });

  it('includes disability status as a flag, not a raw boolean dump', () => {
    const context = buildProfileContext({ disabilityStatus: true });
    expect(context).toContain('has a recorded disability status');
  });

  it('omits a false disabilityStatus rather than stating a negative', () => {
    const context = buildProfileContext({ state: 'Kerala', disabilityStatus: false });
    expect(context).not.toContain('disability');
  });
});
