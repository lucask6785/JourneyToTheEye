import express from "express";
import fs from "fs";
import cors from "cors";
import Papa from "papaparse";

const app = express();
app.use(cors());

app.get("/api/stars", (req, res) => {
  const filePath = "./backend/data/stars.csv";
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Stars data file not found" });
  }

  const file = fs.createReadStream(filePath);
  const stars = [];
  
  Papa.parse(file, {
    header: true,
    step: (row) => {
      console.log("Parsed row:", row.data);
      stars.push(row.data);
    },
    complete: () => {
      console.log(`Loaded ${stars.length} stars`);
      res.json(stars);
    },
    error: (error) => {
      console.error("Error parsing CSV:", error);
      res.status(500).json({ error: "Failed to parse star data" });
    }
  });
});

app.listen(5000, () => console.log("Backend running on port 5000"));
