import { describe, it, expect } from 'vitest';
import { chunkDiff } from './diff.js';

describe('chunkDiff', () => {
  it('should pass through small content', () => {
    const result = chunkDiff('small diff');
    expect(result.body).toBe('small diff');
    expect(result.truncated).toBe(false);
  });

  it('should truncate very large content', () => {
    const large = 'a'.repeat(101_000);
    const result = chunkDiff(large);
    expect(result.body.length).toBeLessThanOrEqual(100_050);
    expect(result.truncated).toBe(true);
    expect(result.body).toContain('[diff truncated');
  });

  it('should warn but not truncate content near threshold', () => {
    const med = 'a'.repeat(25_000);
    const result = chunkDiff(med);
    expect(result.body.length).toBe(25_000);
    expect(result.truncated).toBe(false);
  });
});
