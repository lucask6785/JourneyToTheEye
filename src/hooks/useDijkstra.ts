import { useState, useCallback } from 'react';
import { CONFIG } from '../constants';
import type { DijkstraResponse } from '../types';

export function useDijkstra() {
  const [pathStarIds, setPathStarIds] = useState<Set<number> | null>(null);
  const [pathSequence, setPathSequence] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDijkstra = useCallback(async (startStarId: number, destinationStarId: number, fuel: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Update URL to include startStarId and destinationStarId parameters
      const response = await fetch(CONFIG.DJIKSTRA_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DijkstraResponse = await response.json();
      console.log(`Path found: ${data.sequence.length} stars, distance: ${data.distance}`);
      
      setPathStarIds(new Set(data.sequence));
      setPathSequence(data.sequence);
    } catch (err) {
      console.error('Pathfinding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load path');
    } finally {
      setLoading(false);
    }
  }, []);

  return { pathStarIds, pathSequence, loading, error, runDijkstra };
}
