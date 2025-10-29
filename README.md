# Journey To The Eye - Star Visualization ✨

An interactive 3D web application that visualizes over 100,000 stars from a CSV dataset. Built with React, Three.js, and Python backend for efficient spatial queries.

**Inspired by the game Outer Wilds** | Built for COP3530 Project 2

## 🌟 Features

- **Interactive 3D visualization** of 100,000+ stars
- **Level of Detail (LOD) rendering** for optimal performance
- **Click-to-zoom** on individual stars
- **Smooth camera controls** with orbit navigation
- **Backend k-d tree** for efficient spatial queries
- **Real-time performance metrics**

## 🏗️ Architecture

This project uses a client-server architecture:

- **Frontend (React + Three.js)**: Renders stars using WebGL with LOD optimization
- **Backend (FastAPI + Python)**: Loads star data, builds k-d trees, and provides spatial query APIs
- **Data**: 100,000+ stars stored in `public/stars.csv` with position and metadata

## 🚀 Setup

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn**

### Backend Setup

1. **Navigate to the project directory**
   ```bash
   cd JourneyToTheEye
   ```

2. **Create a Python virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend server**
   ```bash
   cd src/backend
   uvicorn api:app --reload
   ```
   
   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Open a new terminal** (keep backend running)

2. **Navigate to the project directory**
   ```bash
   cd JourneyToTheEye
   ```

3. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   The app will be available at `http://localhost:5173`

## 🎮 Usage

- **Rotate view**: Click and drag
- **Zoom**: Mouse wheel or pinch
- **Pan**: Right-click and drag
- **Select star**: Click on any star to zoom in and highlight it

## 🛠️ Development

### Build for Production

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

### Run Linter

```bash
npm run lint
```

### Backend API Endpoints

- `GET /` - Health check
- `GET /stars/all` - Get all star data with metadata
- `GET /graph?fuel=5.0` - Build adjacency graph with fuel parameter
- `GET /stars/{star_id}/neighbors?fuel=5.0` - Get neighbors of specific star
- `GET /stars/region` - Query stars in a bounding box

## 📁 Project Structure

```
JourneyToTheEye/
├── public/
│   └── stars.csv              # Star dataset (100k+ stars)
├── src/
│   ├── backend/
│   │   ├── api.py             # FastAPI server with endpoints
│   │   └── backend.py         # k-d tree and spatial queries
│   ├── App.tsx                # Main React component
│   ├── starRenderer.ts        # Three.js rendering logic
│   ├── constants.ts           # Configuration constants
│   └── main.tsx               # React entry point
├── requirements.txt           # Python dependencies
├── package.json               # Node dependencies
└── README.md                  # This file
```

## 🔧 Configuration

Edit `src/constants.ts` to adjust:

- **Performance settings**: LOD distance, update interval, max detailed stars
- **Camera settings**: FOV, near/far planes, initial position
- **Rendering settings**: Point size, star size, glow effects
- **Backend URL**: Change if running backend on different port

## 🐛 Troubleshooting

### "Error loading stars" message

- Make sure the backend server is running on port 8000
- Check that `public/stars.csv` exists
- Verify Python dependencies are installed

### Poor performance

- Reduce `MAX_DETAILED_STARS` in `constants.ts`
- Increase `DETAIL_DISTANCE` to show detailed stars only when closer
- Close other browser tabs/applications

### Backend import errors

- Ensure you're in the virtual environment
- Verify all packages in `requirements.txt` are installed
- Check Python version (3.8+)

## 📝 Technologies Used

- **React 19** - UI framework
- **Three.js** - 3D rendering
- **TypeScript** - Type safety
- **Vite** - Build tool
- **FastAPI** - Python backend framework
- **NumPy/SciPy** - Scientific computing and k-d trees

## 📄 License

Built with love for COP3530 Project 2 ✨
