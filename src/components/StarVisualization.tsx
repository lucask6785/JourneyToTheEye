import type { Star } from "../types/star.types";

interface StarVisualizationProps {
  stars: Star[];
  maxStars?: number;
}

export function StarVisualization({ 
  stars, 
  maxStars = 20000 
}: StarVisualizationProps) {
  const displayedStars = stars.slice(0, maxStars);

  return (
    <svg 
      width="800" 
      height="600" 
      style={{ background: "black", border: "1px solid #333" }}
    >
      {displayedStars.map((star, i) => {
        const magnitude = star.mag ?? 5;
        const radius = Math.min(5, Math.max(0.5, 5 - magnitude / 5));

        return (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={radius}
            fill="white"
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}
