import { useEffect, useState } from "react";
import { starApi } from "./services/api";
import { StarVisualization } from "./components/StarVisualization";
import { StarStats } from "./components/StarStats";
import type { Star } from "./types/star.types";
import "./App.css";

function App() {
  const [stars, setStars] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await starApi.getStars();
        setStars(data);
        console.log(`Successfully loaded ${data.length} stars from API`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load stars";
        setError(errorMessage);
        console.error("Error loading stars:", err);
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
        <p style={{ fontSize: "0.9em", marginTop: "10px" }}>
          Make sure the backend server is running on port 5000
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <StarStats totalStars={stars.length} displayedStars={Math.min(100, stars.length)} />
      <StarVisualization stars={stars} maxStars={100} />
    </div>
  );
}

export default App;
