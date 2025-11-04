import type { StarData } from '../types';

export function InfoBox({ 
  totalStars, 
  detailedCount, 
  pathCount, 
  selectedStar, 
  startingStar, 
  destinationStar,
  pathDistance
}: {
  totalStars: number;
  detailedCount: number;
  pathCount?: number;
  selectedStar: StarData | null;
  startingStar: StarData | null;
  destinationStar: StarData | null;
  pathDistance: number | null;
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

  return (
    <div className="info-box">
      <div className="info-item">Total stars: {totalStars.toLocaleString()}</div>
      <div className="info-item">Detailed stars: {detailedCount}</div>
      {pathCount !== undefined && <div className="info-item">Path stars: {pathCount}</div>}
      <div className="info-item">Selected: {formatStar(selectedStar)}</div>
      <div className="info-item">Starting Star: {formatStar(startingStar)}</div>
      <div className="info-item">Destination Star: {formatStar(destinationStar)}</div>
      <div className="info-item">Total distance: {formatDistance(pathDistance)}</div>
    </div>
  );
}