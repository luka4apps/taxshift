import type { Measure, Persona } from './schema.ts';

export interface PersonaInfo {
  id: Persona;
  slug: string;
  label: string;
  short: string;
}

export const PERSONAS: readonly PersonaInfo[] = [
  { id: 'property', slug: 'property-investors', label: 'Property investors', short: 'Property' },
  { id: 'shares', slug: 'share-investors', label: 'Share investors', short: 'Shares' },
  { id: 'smsf', slug: 'smsf-trustees', label: 'SMSF trustees', short: 'SMSF' },
  { id: 'business', slug: 'business-owners', label: 'Business owners and trusts', short: 'Business' },
];

export function personaBySlug(slug: string): PersonaInfo | undefined {
  return PERSONAS.find((p) => p.slug === slug);
}

export function personaById(id: Persona): PersonaInfo {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona ${id}`);
  return p;
}

export function byPriority<T extends Pick<Measure, 'priority'>>(a: T, b: T): number {
  return a.priority - b.priority;
}

export function measuresFor<T extends Pick<Measure, 'priority' | 'personas'>>(measures: T[], persona?: Persona): T[] {
  return measures.filter((m) => !persona || m.personas.includes(persona)).sort(byPriority);
}
