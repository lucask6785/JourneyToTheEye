# Journey To The Eye - Star Visualization

## Project Structure

```
JourneyToTheEye/
├── backend/                    # Backend API server
│   ├── package.json           # Backend dependencies
│   ├── server.js              # Express server with star data API
│   └── data/
│       └── stars.csv          # Star dataset
│
├── src/                       # Frontend React application
│   ├── components/            # React components
│   │   ├── StarVisualization.tsx  # SVG star rendering component
│   │   └── StarStats.tsx          # Statistics display component
│   ├── services/              # API service layer
│   │   └── api.ts             # Backend API client
│   ├── types/                 # TypeScript type definitions
│   │   └── star.types.ts      # Star interface
│   ├── App.tsx                # Main app component
│   ├── App.css                # App styles
│   ├── main.tsx               # App entry point
│   └── index.css              # Global styles
│
├── public/                    # Static assets
└── package.json               # Frontend dependencies & scripts
```

## Setup & Installation

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
npm install
```

## Running the Application

You need to run both the backend and frontend servers:

### Option 1: Using separate terminals

**Terminal 1 - Backend Server:**
```bash
npm run start:backend
```
This starts the Express server on `http://localhost:5000`

**Terminal 2 - Frontend Server:**
```bash
npm run dev
```
This starts the Vite dev server on `http://localhost:5173`

### Option 2: Individual commands

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
npm run frontend
```

## API Endpoints

### GET /api/stars
Returns all star data from the CSV file.

**Response:**
```json
[
  {
    "x": "400",
    "y": "300",
    "magnitude": "2.5"
  },
  ...
]
```

## Components

### StarVisualization
Renders stars as SVG circles on a black background.
- **Props:** `stars` (array), `maxStars` (optional, default: 100)
- Calculates star radius based on magnitude
- Displays up to 100 stars for performance

### StarStats
Displays statistics about the star dataset.
- **Props:** `totalStars` (number), `displayedStars` (number)
- Shows total count and how many are currently visible

## Technical Details

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Node.js, Express, PapaParse
- **Data Format:** CSV with columns: x, y, magnitude
- **Total Stars:** 119,626 stars in the dataset

## Building for Production

```bash
npm run build
```

This will create an optimized production build in the `dist/` folder.
