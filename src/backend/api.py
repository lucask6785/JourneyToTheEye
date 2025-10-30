# api.py - FastAPI REST API server for star data queries

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Cross-Origin Resource Sharing for frontend access
from backend import load_stars, build_kdtree_data, build_graph, get_neighbors, djikstras
from scipy.spatial import KDTree
import numpy as np

app = FastAPI()

# This allows the frontend (running on port 5173) to make requests to the backend (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin - For production, use: allow_origins=["http://localhost:5173"]
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers in requests
)

# Avoids repeated file reads and k-d tree construction
STAR_NODES = None
KDTREE = None
STAR_DATA = None

@app.on_event("startup")
async def startup_event():
    # Loads all star data into memory and builds spatial index structures.
    # This is expensive (O(n log n)) but only happens once at startup.

    global STAR_NODES, KDTREE, STAR_DATA
    
    print("Loading stars...")
    
    filepath = "../../public/stars.csv"
    
    # Load all stars from CSV file and creates StarNode objects
    STAR_NODES = load_stars(filepath)
    
    # Build k-d tree for efficient spatial queries
    # Extract just the [x, y, z] positions as a numpy array
    positions = np.array([[node.x, node.y, node.z] for node in STAR_NODES])
    KDTREE = KDTree(positions)  # O(n log n)
    
    # Pre-format data for the main endpoint that sends all stars to frontend
    STAR_DATA = build_kdtree_data(STAR_NODES)
    
    print(f"Loaded {len(STAR_NODES)} stars")

@app.get("/djikstra")
async def djikstra_call(fuel = 30, start = 0, end = 1):
    graph = build_graph(STAR_NODES, fuel)
    index_sequence, distance = djikstras(STAR_NODES, graph, start, end)
    
    # Convert array indices to actual star IDs
    id_sequence = [STAR_NODES[i].id for i in index_sequence]
    
    return {
        "sequence": id_sequence,
        "distance": distance
    }


@app.get("/")
async def root():
    # Health check endpoint
    
    return {
        "message": "Star backend is running",
        "star_count": len(STAR_NODES) if STAR_NODES else 0  # Return 0 if data not loaded yet
    }

@app.get("/stars/all")
async def get_all_stars():
    """
    Main endpoint: Send all star data to the frontend.
    Returns positions and metadata for all 100k+ stars in one response.
    
    The frontend uses this data to:
    1. Build its own client-side k-d tree for LOD calculations
    2. Render stars in the 3D scene
    3. Display star information on selection
    
    Returns:
        Dictionary with:
        - positions: [[x,y,z], ...] array of all star coordinates
        - metadata: Array of {id, name, magnitude} objects
        - bounds: {min: [x,y,z], max: [x,y,z]} bounding box
        - count: Total number of stars
        
    Raises:
        HTTPException 503: If data hasn't finished loading yet
    """
    # Check if startup has completed
    if STAR_DATA is None:
        raise HTTPException(
            status_code=503,  # Service Unavailable
            detail="Star data not loaded yet"
        )

    return STAR_DATA

# @app.get("/graph")
# async def get_graph(fuel: float = 5.0):
#     # Verify data is loaded before processing request
#     if STAR_NODES is None:
#         raise HTTPException(status_code=503, detail="Star data not loaded yet")
    
#     print(f"Building graph with fuel={fuel}...")  # Log for monitoring performance
    
#     # Build adjacency list using k-d tree for efficiency
#     # Returns: graph[i] = [list of neighbor indices]
#     graph = build_graph(STAR_NODES, fuel, use_kdtree=True)
    
#     # Convert adjacency list to edge list for more compact transmission
#     # Edge list: [[0,5], [0,12], [1,3], ...] instead of adjacency list
#     edges = []
#     for i, neighbors in enumerate(graph):
#         for j in neighbors:
#             # Only add edge once (i < j) to avoid duplicates in undirected graph
#             # Without this check, edge (i,j) would appear twice: once as (i,j) and once as (j,i)
#             if i < j:
#                 edges.append([i, j])  # Add edge between star i and star j
    
#     return {
#         "nodes": len(STAR_NODES),  # Total number of nodes in graph
#         "edges": edges,  # List of edges (connections between stars)
#         "fuel": fuel  # Echo back the fuel parameter used
#     }
