import { describe, it, expect } from 'vitest';
import { classifyIntent, intentFraming } from './intentClassifier.js';

describe('classifyIntent', () => {
  it('classifies a scheme-discovery question as recommend', () => {
    expect(classifyIntent('Which schemes am I eligible for as a farmer in Karnataka?')).toBe('recommend');
    expect(classifyIntent('What schemes exist for women starting a business?')).toBe('recommend');
  });

  it('classifies a term/definition question as explain', () => {
    expect(classifyIntent('What does domicile certificate mean?')).toBe('explain');
    expect(classifyIntent('Can you explain what an EWS certificate is?')).toBe('explain');
  });

  it('classifies a comparison question as compare', () => {
    expect(classifyIntent('Compare PM-KISAN and the state farmer subsidy')).toBe('compare');
    expect(classifyIntent('Which is better, scheme A vs scheme B?')).toBe('compare');
  });

  it('classifies a documents/process question as application_help', () => {
    expect(classifyIntent('What documents do I need to apply?')).toBe('application_help');
    expect(classifyIntent('How do I apply for this scholarship?')).toBe('application_help');
  });

  it('checks compare before application_help when both could match', () => {
    // "compare" is checked ahead of "apply"/"application" in the pattern
    // order, so a message containing both reads as a comparison request.
    expect(classifyIntent('Compare how to apply for scheme A vs scheme B')).toBe('compare');
  });

  it('falls back to general for an empty or unmatched message', () => {
    expect(classifyIntent('')).toBe('general');
    expect(classifyIntent('   ')).toBe('general');
    expect(classifyIntent('hello there')).toBe('general');
  });

  it('recognises Hindi-language intent keywords', () => {
    expect(classifyIntent('कौन-सी योजना मेरे लिए उपयुक्त है?')).toBe('recommend');
    expect(classifyIntent('आवेदन के लिए कौन से दस्तावेज़ चाहिए?')).toBe('application_help');
  });
});

describe('intentFraming', () => {
  it('returns a distinct, non-empty framing string per intent', () => {
    const intents = ['recommend', 'explain', 'compare', 'application_help', 'faq', 'general'] as const;
    const framings = intents.map(intentFraming);
    framings.forEach((f) => expect(f.length).toBeGreaterThan(0));
    expect(new Set(framings).size).toBe(framings.length);
  });
});
