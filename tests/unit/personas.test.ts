import { describe, expect, it } from 'vitest';
import { PERSONAS, measuresFor, personaBySlug } from '../../src/lib/personas.ts';
import { aMeasure } from './fixtures.ts';

describe('personas', () => {
  it('should_offer_exactly_the_four_audiences_with_url_slugs', () => {
    expect(PERSONAS.map((p) => p.slug)).toEqual([
      'property-investors',
      'share-investors',
      'smsf-trustees',
      'business-owners',
    ]);
  });

  it('should_find_a_persona_by_its_url_slug', () => {
    expect(personaBySlug('smsf-trustees')?.id).toBe('smsf');
    expect(personaBySlug('nope')).toBeUndefined();
  });

  it('should_return_only_measures_affecting_the_persona_ordered_by_priority', () => {
    // Given three measures with mixed audiences
    const measures = [
      aMeasure({ id: 'b', priority: 2, personas: ['property'] }),
      aMeasure({ id: 'a', priority: 1, personas: ['property', 'shares'] }),
      aMeasure({ id: 'c', priority: 3, personas: ['smsf'] }),
    ];
    // When
    const result = measuresFor(measures, 'property');
    // Then
    expect(result.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('should_return_all_measures_by_priority_when_no_persona_given', () => {
    const measures = [aMeasure({ id: 'b', priority: 2 }), aMeasure({ id: 'a', priority: 1 })];
    expect(measuresFor(measures).map((m) => m.id)).toEqual(['a', 'b']);
  });
});
