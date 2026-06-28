import { describe, it, expect } from 'vitest';
import { computeRisk } from './risk.js';

describe('computeRisk', () => {
  it('should compute Low risk for high scores', () => {
    const dims = [
      { name: 'tests', score: 90 },
      { name: 'code_quality', score: 85 },
      { name: 'security', score: 95 },
      { name: 'performance', score: 80 },
      { name: 'architecture', score: 85 },
    ];
    const result = computeRisk(dims);
    expect(result.riskLabel).toBe('Low');
    expect(result.riskScore).toBeLessThanOrEqual(30);
  });

  it('should compute High risk for low scores', () => {
    const dims = [
      { name: 'tests', score: 20 },
      { name: 'code_quality', score: 30 },
      { name: 'security', score: 10 },
      { name: 'performance', score: 40 },
      { name: 'architecture', score: 25 },
    ];
    const result = computeRisk(dims);
    expect(result.riskLabel).toBe('High');
    expect(result.riskScore).toBeGreaterThanOrEqual(61);
  });

  it('should compute Medium risk for moderate scores', () => {
    const dims = [
      { name: 'tests', score: 50 },
      { name: 'code_quality', score: 60 },
      { name: 'security', score: 40 },
      { name: 'performance', score: 70 },
      { name: 'architecture', score: 55 },
    ];
    const result = computeRisk(dims);
    expect(result.riskLabel).toBe('Medium');
    expect(result.riskScore).toBeGreaterThanOrEqual(31);
    expect(result.riskScore).toBeLessThanOrEqual(60);
  });

  it('should skip unassessed dimensions', () => {
    const dims = [
      { name: 'security', score: 90 },
      { name: 'architecture', score: 85 },
      { name: 'tests', score: 0, unassessed: true },
      { name: 'code_quality', score: 0, unassessed: true },
      { name: 'performance', score: 0, unassessed: true },
    ];
    const result = computeRisk(dims);
    expect(result.riskLabel).toBe('Low');
    expect(result.riskScore).toBeLessThanOrEqual(30);
  });

  it('should handle empty or no-valid dimensions gracefully', () => {
    const result = computeRisk([]);
    expect(result.riskScore).toBe(100);
    expect(result.riskLabel).toBe('High');
  });
});
