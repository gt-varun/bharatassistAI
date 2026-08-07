import { describe, it, expect } from 'vitest';
import { localiseScheme } from './retrievalService.js';
import {
  localEmbedding,
  cosineSimilarity,
  schemeIndexText
} from './embeddingProvider.js';
import { reciprocalRankFusion } from './vectorSearch.js';

const baseScheme: any = {
  name: 'PM-KISAN',
  slug: 'pm-kisan',
  shortDescription: 'Income support for farmers.',
  eligibilitySummaryPlain: 'Any landholding farmer family.',
  department: 'Ministry of Agriculture',
  targetSegments: ['farmer']
};

describe('localiseScheme', () => {
  const withHindi = {
    ...baseScheme,
    translations: {
      hi: {
        name: 'पीएम-किसान',
        shortDescription: 'किसानों के लिए आय सहायता।',
        eligibilitySummaryPlain: 'कोई भी भूमिधारक किसान परिवार।',
        verified: true
      }
    }
  };

  it('returns the source text for English and for no language', () => {
    expect(localiseScheme(withHindi, 'en').name).toBe('PM-KISAN');
    expect(localiseScheme(withHindi, undefined).name).toBe('PM-KISAN');
  });

  it('overlays a verified translation', () => {
    const hi = localiseScheme(withHindi, 'hi');
    expect(hi.name).toBe('पीएम-किसान');
    expect(hi.eligibilitySummaryPlain).toBe('कोई भी भूमिधारक किसान परिवार।');
  });

  it('leaves untranslated fields on the source text', () => {
    const hi = localiseScheme(withHindi, 'hi') as any;
    expect(hi.department).toBe('Ministry of Agriculture');
  });

  it('refuses an unverified translation rather than showing unreviewed text', () => {
    const unverified = {
      ...baseScheme,
      translations: { hi: { name: 'मशीनी अनुवाद', verified: false } }
    };
    expect(localiseScheme(unverified, 'hi').name).toBe('PM-KISAN');
  });

  it('falls back cleanly when the language is not translated at all', () => {
    expect(localiseScheme(withHindi, 'ta').name).toBe('PM-KISAN');
    expect(localiseScheme(baseScheme, 'hi').name).toBe('PM-KISAN');
  });

  it('reads translations held as a Mongoose Map', () => {
    const mapped = {
      ...baseScheme,
      translations: new Map([['hi', { name: 'पीएम-किसान', verified: true }]])
    };
    expect(localiseScheme(mapped as any, 'hi').name).toBe('पीएम-किसान');
  });
});

describe('local embedding encoder', () => {
  it('is deterministic and unit length', () => {
    const a = localEmbedding('scholarship for students');
    const b = localEmbedding('scholarship for students');
    expect(a).toEqual(b);
    const magnitude = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('scores a typo closer to its intended word than to an unrelated one', () => {
    const target = localEmbedding('scholarship');
    const typo = localEmbedding('scholarshp');
    const unrelated = localEmbedding('tractor irrigation pump');
    expect(cosineSimilarity(typo, target)).toBeGreaterThan(cosineSimilarity(typo, unrelated));
  });

  it('gives an empty string a zero vector rather than throwing', () => {
    expect(localEmbedding('').every((v) => v === 0)).toBe(true);
    expect(cosineSimilarity(localEmbedding(''), localEmbedding('anything'))).toBe(0);
  });
});

describe('reciprocalRankFusion', () => {
  it('ranks a document found by both arms above one found by either alone', () => {
    const keyword = ['a', 'b', 'c'];
    const semantic = ['c', 'a', 'd'];
    const fused = reciprocalRankFusion([keyword, semantic]);

    expect(fused.get('a')!).toBeGreaterThan(fused.get('b')!);
    expect(fused.get('a')!).toBeGreaterThan(fused.get('d')!);
  });

  it('honours arm weights', () => {
    const heavyKeyword = reciprocalRankFusion([['x'], ['y']], [1.0, 0.5]);
    expect(heavyKeyword.get('x')!).toBeGreaterThan(heavyKeyword.get('y')!);
  });

  it('returns nothing for empty rankings', () => {
    expect(reciprocalRankFusion([[], []]).size).toBe(0);
  });
});

describe('schemeIndexText', () => {
  it('folds the searchable fields into one chunk and drops the empty ones', () => {
    const text = schemeIndexText(baseScheme);
    expect(text).toContain('PM-KISAN');
    expect(text).toContain('Ministry of Agriculture');
    expect(text).toContain('farmer');
    expect(text).not.toContain('undefined');
  });
});
