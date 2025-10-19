import type { Star } from "../types/star.types";

const API_BASE_URL = "http://localhost:5000/api";

export const starApi = {
  // Fetch all stars from the backend API
  async getStars(): Promise<Star[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/stars`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stars: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching stars:", error);
      throw error;
    }
  },
};
