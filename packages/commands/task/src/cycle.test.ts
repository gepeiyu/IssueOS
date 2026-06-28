import { describe, it, expect } from 'vitest';
import { removeCycles } from './cycle.js';

describe('removeCycles', () => {
  it('should pass an acyclic graph unchanged', () => {
    const nodes = [
      { id: 0, dependsOn: [] },
      { id: 1, dependsOn: [0] },
      { id: 2, dependsOn: [1] },
    ];
    const result = removeCycles(JSON.parse(JSON.stringify(nodes)));
    expect(result.isAcyclic).toBe(true);
    expect(result.removedEdges).toHaveLength(0);
    expect(result.nodes[0].dependsOn).toEqual([]);
    expect(result.nodes[1].dependsOn).toEqual([0]);
    expect(result.nodes[2].dependsOn).toEqual([1]);
  });

  it('should detect and remove a simple cycle', () => {
    const nodes = [
      { id: 0, dependsOn: [1] },
      { id: 1, dependsOn: [0] },
    ];
    const result = removeCycles(JSON.parse(JSON.stringify(nodes)));
    expect(result.isAcyclic).toBe(false);
    expect(result.removedEdges.length).toBeGreaterThan(0);
  });

  it('should handle no dependencies', () => {
    const nodes = [
      { id: 0, dependsOn: [] },
      { id: 1, dependsOn: [] },
    ];
    const result = removeCycles(JSON.parse(JSON.stringify(nodes)));
    expect(result.isAcyclic).toBe(true);
    expect(result.removedEdges).toHaveLength(0);
  });

  it('should handle a self-loop', () => {
    const nodes = [
      { id: 0, dependsOn: [0] },
    ];
    const result = removeCycles(JSON.parse(JSON.stringify(nodes)));
    expect(result.isAcyclic).toBe(false);
    expect(result.removedEdges.length).toBeGreaterThan(0);
  });

  it('should handle diamond DAG', () => {
    const nodes = [
      { id: 0, dependsOn: [] },
      { id: 1, dependsOn: [0] },
      { id: 2, dependsOn: [0] },
      { id: 3, dependsOn: [1, 2] },
    ];
    const result = removeCycles(JSON.parse(JSON.stringify(nodes)));
    expect(result.isAcyclic).toBe(true);
    expect(result.removedEdges).toHaveLength(0);
  });

  it('should ignore references to non-existent ids', () => {
    const nodes = [
      { id: 0, dependsOn: [999] },
    ];
    const result = removeCycles(JSON.parse(JSON.stringify(nodes)));
    expect(result.isAcyclic).toBe(true);
    expect(result.removedEdges).toHaveLength(0);
    expect(result.nodes[0].dependsOn).toEqual([]);
  });
});
