import { useState, useEffect } from 'react';
import { CONFIG } from '../constants';
import type { StarData, BackendResponse } from '../types';

export function useFetchStars() {
  const [stars, setStars] = useState<StarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch(CONFIG.BACKEND_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: BackendResponse = await response.json();
        const transformedStars: StarData[] = data.positions.map((pos, index) => ({
          id: data.metadata[index].id,
          x: pos[0],
          y: pos[1],
          z: pos[2],
          name: data.metadata[index].name,
          magnitude: data.metadata[index].magnitude,
        }));
        
        setStars(transformedStars);
        console.log(`Loaded ${transformedStars.length} stars`);
      } catch (err) {
        console.error('Error fetching stars:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stars');
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  return { stars, loading, error };
}