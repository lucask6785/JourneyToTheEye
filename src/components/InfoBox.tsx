import type { StarData } from '../types';

export function InfoBox({ 
  totalStars, 
  detailedCount, 
  pathCount, 
  selectedStar, 
  startingStar, 
  destinationStar,
  pathDistance,
  dijkstraTime,
  astarTime,
  isDijkstraComputing,
  isAstarComputing
}: {
  totalStars: number;
  detailedCount: number;
  pathCount?: number;
  selectedStar: StarData | null;
  startingStar: StarData | null;
  destinationStar: StarData | null;
  pathDistance: number | null;
  dijkstraTime?: number | null;
  astarTime?: number | null;
  isDijkstraComputing?: boolean; 
  isAstarComputing?: boolean;
}) {
  const formatStar = (star: StarData | null) => 
    star ? `${star.name} (ID: ${star.id})` : 'None';

  const formatDistance = (distance: number | null) => {
    if (!distance) {
      return 'None';
    } else if (distance == -1) {
      return 'No Path Found';
    } else {
      return distance.toLocaleString() + ' parsecs';
    }
  }

  const formatTime = (ms: number | null, isComputing?: boolean) => {
    if (ms === null) return '--';
    if (ms == -1) return 'No path found'
    if (isComputing && ms !== null) {
      return `${(ms / 1000).toFixed(3)}s (computing...)`;
    }
    return `${(ms / 1000).toFixed(3)}s`;
  }

  return (
    <div className="info-box">
      <div className="info-item">Total stars: {totalStars.toLocaleString()}</div>
      <div className="info-item">Detailed stars: {detailedCount}</div>
      {pathCount !== undefined && <div className="info-item">Path stars: {pathCount}</div>}
      <div className="info-item">Selected: {formatStar(selectedStar)}</div>
      <div className="info-item">Starting Star: {formatStar(startingStar)}</div>
      <div className="info-item">Destination Star: {formatStar(destinationStar)}</div>
      <div className="info-item">Total distance: {formatDistance(pathDistance)}</div>
      {dijkstraTime !== undefined && <div className="info-item">Dijkstra time: {formatTime(dijkstraTime, isDijkstraComputing)}</div>}
      {astarTime !== undefined && <div className="info-item">A* time: {formatTime(astarTime, isAstarComputing)}</div>}
    </div>
  );
}