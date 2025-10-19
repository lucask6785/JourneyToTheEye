interface StarStatsProps {
  totalStars: number;
  displayedStars: number;
}

export function StarStats({ totalStars, displayedStars }: StarStatsProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2>Star Data Visualization</h2>
      <p>
        Total Stars: <strong>{totalStars}</strong>
      </p>
      <p>
        Displayed: <strong>{displayedStars}</strong>
      </p>
    </div>
  );
}
