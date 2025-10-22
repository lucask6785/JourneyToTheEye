# Journey To The Eye - Star Visualization

## Project Structure

```
JourneyToTheEye/
├── public/
│   └── stars.csv              # Star dataset (119,626 stars)
│
├── src/
│   ├── components/
│   │   └── StarVisualization.tsx  # SVG star rendering component
│   ├── types/
│   │   └── star.types.ts          # TypeScript type definitions
│   ├── App.tsx                    # Main app component with CSV loading
│   ├── App.css                    # App styles
│   ├── main.tsx                   # App entry point
│   └── index.css                  # Global styles
│
└── package.json                   # Dependencies & scripts
```

## Setup & Installation

```bash
npm install
```

## Running the Application

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173`

## Components

### StarVisualization
Renders stars as SVG circles on a black background.
- **Props:** `stars` (Star[]), `maxStars` (optional, default: 100)
- Calculates star radius based on magnitude
- Displays first N stars from the dataset

### App
Main component that:
- Loads the CSV file from `/stars.csv`
- Parses it using PapaParse with automatic type conversion
- Manages loading and error states
- Displays statistics and the star visualization

## Technical Details

- **Frontend:** React 19, TypeScript, Vite
- **CSV Parsing:** PapaParse
- **Data Format:** CSV with columns: x, y, mag (magnitude)
- **Total Stars:** 119,626 stars in the dataset

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

