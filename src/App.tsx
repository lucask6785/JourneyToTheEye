import { useEffect, useState } from "react";
import Papa from "papaparse";
import { StarVisualization } from "./components/StarVisualization";
import type { Star } from "./types/star.types";
import "./App.css";

const MAX_STARS = 100;

function App() {
  const [stars, setStars] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/stars.csv");
        if (!response.ok) {
          throw new Error(`Failed to fetch stars: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            const parsedStars = results.data
              .filter((row: any) => row.x && row.y)
              .map((row: any) => ({
                x: Number(row.x),
                y: Number(row.y),
                mag: row.mag ? Number(row.mag) : undefined,
              }));
            setStars(parsedStars);
          },
          error: (err: Error) => {
            throw new Error(`Failed to parse CSV: ${err.message}`);
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load stars";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading stars...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  const displayedStars = Math.min(MAX_STARS, stars.length);

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2>Star Data Visualization</h2>
        <p>
          Total Stars: <strong>{stars.length}</strong>
        </p>
        <p>
          Displayed: <strong>{displayedStars}</strong>
        </p>
      </div>
      <StarVisualization stars={stars} maxStars={MAX_STARS} />
    </div>
  );
}

export default App;
