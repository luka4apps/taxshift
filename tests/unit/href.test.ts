import { describe, expect, it } from 'vitest';
import { joinBase } from '../../src/lib/href.ts';

describe('joinBase', () => {
  it.each([
    ['/taxshift/', 'changes/cgt/', '/taxshift/changes/cgt/'],
    ['/taxshift', '/changes/cgt/', '/taxshift/changes/cgt/'],
    ['/', '/glossary/', '/glossary/'],
    ['/taxshift/', '', '/taxshift/'],
  ])('should_join_base_%s_and_path_%s_without_double_slashes', (base, path, expected) => {
    expect(joinBase(base, path)).toBe(expected);
  });
});
