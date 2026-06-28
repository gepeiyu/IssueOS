export interface DagNode {
  id: number;
  dependsOn: number[];
}

export interface CycleResult {
  nodes: DagNode[];
  removedEdges: { from: number; to: number }[];
  isAcyclic: boolean;
}

export function removeCycles(nodes: DagNode[]): CycleResult {
  const removedEdges: { from: number; to: number }[] = [];

  const idSet = new Set(nodes.map(n => n.id));

  for (const n of nodes) {
    n.dependsOn = n.dependsOn.filter(d => idSet.has(d));
  }

  const inDegree = new Map<number, number>();
  const adj = new Map<number, number[]>();
  for (const n of nodes) {
    if (!inDegree.has(n.id)) inDegree.set(n.id, 0);
    if (!adj.has(n.id)) adj.set(n.id, []);
    for (const dep of n.dependsOn) {
      adj.get(n.id)!.push(dep);
      inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1);
    }
  }

  const queue: number[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: number[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const [otherId, deps] of adj) {
      const idx = deps.indexOf(id);
      if (idx !== -1) {
        deps.splice(idx, 1);
        inDegree.set(otherId, (inDegree.get(otherId) ?? 0) - 1);
        if (inDegree.get(otherId) === 0) {
          queue.push(otherId);
        }
      }
    }
  }

  const remainingIds = new Set(idSet);
  for (const id of sorted) remainingIds.delete(id);

  if (remainingIds.size > 0) {
    for (const n of nodes) {
      if (!remainingIds.has(n.id)) continue;
      const originalDeps = [...n.dependsOn];
      n.dependsOn = n.dependsOn.filter(d => !remainingIds.has(d));
      for (const d of originalDeps) {
        if (remainingIds.has(d)) removedEdges.push({ from: n.id, to: d });
      }
    }
  }

  return { nodes, removedEdges, isAcyclic: remainingIds.size === 0 };
}
