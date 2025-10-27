# api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend import load_stars, build_kdtree_data, build_graph, get_neighbors
from scipy.spatial import KDTree
import numpy as np

app = FastAPI()

# Add CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data once at startup
STAR_NODES = None
KDTREE = None
STAR_DATA = None

@app.on_event("startup")
async def startup_event():
    global STAR_NODES, KDTREE, STAR_DATA
    print("Loading stars...")
    filepath = "../public/stars.csv"
    STAR_NODES = load_stars(filepath)
    
    # Build k-d tree
    positions = np.array([[node.x, node.y, node.z] for node in STAR_NODES])
    KDTREE = KDTree(positions)
    
    # Prepare data for client
    STAR_DATA = build_kdtree_data(STAR_NODES)
    print(f"Loaded {len(STAR_NODES)} stars")

@app.get("/")
async def root():
    return {"message": "Star backend is running", "star_count": len(STAR_NODES) if STAR_NODES else 0}

@app.get("/stars/all")
async def get_all_stars():
    """Send all star data to client for client-side k-d tree"""
    if STAR_DATA is None:
        raise HTTPException(status_code=503, detail="Star data not loaded yet")
    return STAR_DATA

@app.get("/graph")
async def get_graph(fuel: float = 5.0):
    """Build adjacency graph (may be slow for 100k stars)"""
    if STAR_NODES is None:
        raise HTTPException(status_code=503, detail="Star data not loaded yet")
    
    print(f"Building graph with fuel={fuel}...")
    graph = build_graph(STAR_NODES, fuel, use_kdtree=True)
    
    # Convert to edge list format (more compact than adjacency matrix)
    edges = []
    for i, neighbors in enumerate(graph):
        for j in neighbors:
            if i < j:  # Avoid duplicates for undirected graph
                edges.append([i, j])
    
    return {
        "nodes": len(STAR_NODES),
        "edges": edges,
        "fuel": fuel
    }

@app.get("/stars/{star_id}/neighbors")
async def get_star_neighbors(star_id: int, fuel: float = 5.0):
    """Get neighbors of a specific star within fuel range"""
    if STAR_NODES is None or KDTREE is None:
        raise HTTPException(status_code=503, detail="Star data not loaded yet")
    
    if star_id < 0 or star_id >= len(STAR_NODES):
        raise HTTPException(status_code=404, detail="Star not found")
    
    neighbors = get_neighbors(STAR_NODES, KDTREE, star_id, fuel)
    
    return {
        "star_id": star_id,
        "position": [STAR_NODES[star_id].x, STAR_NODES[star_id].y, STAR_NODES[star_id].z],
        "neighbors": neighbors,
        "fuel": fuel
    }

@app.get("/stars/region")
async def get_stars_in_region(
    min_x: float, max_x: float,
    min_y: float, max_y: float,
    min_z: float, max_z: float
):
    """Get stars within a bounding box (for frustum culling if needed)"""
    if STAR_NODES is None:
        raise HTTPException(status_code=503, detail="Star data not loaded yet")
    
    # Filter stars in bounding box
    stars_in_region = []
    for i, node in enumerate(STAR_NODES):
        if (min_x <= node.x <= max_x and
            min_y <= node.y <= max_y and
            min_z <= node.z <= max_z):
            stars_in_region.append({
                'index': i,
                'position': [node.x, node.y, node.z],
                'id': node.id
            })
    
    return {
        'stars': stars_in_region,
        'count': len(stars_in_region)
    }