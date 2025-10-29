# backend.py

import csv
import numpy as np
from scipy.spatial import KDTree

class StarNode:
    """
    Represents a single star with its 3D position and metadata.
    This class serves as a simple data container for star properties.
    """
    def __init__(self, id, x, y, z, **metadata):
        self.id = id  # Unique identifier for the star
        self.x = x    # X-coordinate in 3D space
        self.y = y    # Y-coordinate in 3D space
        self.z = z    # Z-coordinate in 3D space
        self.metadata = metadata  # Dictionary to store any extra columns from CSV (name, magnitude, etc.)

def load_stars(filepath):
    """
    Load star data from a CSV file and create StarNode objects.
    
    Expected CSV format:
    id,x,y,z,name,mag
    1,10.5,20.3,-5.2,Alpha Centauri,0.01
    
    Args:
        filepath: Path to the CSV file containing star data
        
    Returns:
        List of StarNode objects with position and metadata
    """
    nodes = []  # List to accumulate all star nodes
    
    # Open CSV file with UTF-8 encoding to handle special characters in star names
    with open(filepath, 'r', newline='', encoding='utf-8') as file:
        # DictReader reads CSV and creates a dictionary for each row using headers as keys
        reader = csv.DictReader(file)
        
        # Process each row in the CSV file
        for row in reader:
            # Create a new StarNode object, converting string values to appropriate types
            newStar = StarNode(
                id = int(row['id']),      # Convert string ID to integer
                x = float(row['x']),      # Convert string coordinates to floats
                y = float(row['y']),
                z = float(row['z']),
                # Additional metadata - use .get() with defaults to handle missing columns gracefully
                name=row.get('name', ''),  # Star name, defaults to empty string if missing
                magnitude=float(row.get('mag', 0))  # Brightness, defaults to 0 if missing
            )
            nodes.append(newStar)  # Add star to our collection
    
    return nodes  # Return list of all loaded stars

def build_kdtree_data(nodes):
    """
    Convert star nodes into a format optimized for client-side rendering and queries.
    Builds a k-d tree structure for efficient spatial lookups (O(log n) instead of O(n)).
    
    K-d trees partition space recursively, splitting along different axes at each level.
    This enables fast nearest-neighbor queries and range searches in 3D space.
    
    Args:
        nodes: List of StarNode objects
        
    Returns:
        Dictionary containing:
        - positions: 2D array of [x,y,z] coordinates for all stars
        - metadata: Array of dictionaries with star properties (id, name, magnitude)
        - bounds: Min/max coordinates of entire dataset (for camera setup)
        - count: Total number of stars
    """
    # Extract positions as numpy array for efficient numerical operations
    # List comprehension creates [[x1,y1,z1], [x2,y2,z2], ...] structure
    positions = np.array([[node.x, node.y, node.z] for node in nodes])
    
    # Build k-d tree from positions for server-side spatial queries
    # This creates a binary tree that splits space at median points along alternating axes
    # Time complexity: O(n log n) to build, O(log n) for queries
    kdtree = KDTree(positions)
    
    # Prepare metadata array - separate from positions for cleaner data structure
    # This allows the frontend to easily access star properties when rendering
    metadata = [
        {
            'id': node.id,  # Unique star identifier
            'name': node.metadata.get('name', f'Star-{node.id}'),  # Name or fallback ID
            'magnitude': node.metadata.get('magnitude', 0)  # Brightness value
        }
        for node in nodes
    ]
    
    # Return complete dataset package for transmission to frontend
    return {
        'positions': positions.tolist(),  # Convert numpy array to JSON-serializable list: [[x,y,z], ...]
        'metadata': metadata,  # Array of star properties
        'bounds': {
            # Calculate bounding box of entire dataset - useful for camera positioning
            'min': positions.min(axis=0).tolist(),  # [min_x, min_y, min_z]
            'max': positions.max(axis=0).tolist()   # [max_x, max_y, max_z]
        },
        'count': len(nodes)  # Total number of stars loaded
    }

def build_graph(nodes, fuel, use_kdtree=True):
    """
    Build an adjacency graph where edges connect stars within 'fuel' distance.
    This represents which stars are reachable from each other given a fuel constraint.
    Uses k-d tree for efficient neighbor finding - critical for 100k+ stars.
    
    Graph structure: graph[i] = [list of indices of stars within fuel distance of star i]
    
    Time complexity:
    - Naive approach (distance calculation for all pairs): O(n²) - too slow!
    - K-d tree approach: O(n log n) - much better!
    
    Args:
        nodes: List of StarNode objects
        fuel: Maximum distance to consider stars as neighbors
        use_kdtree: Whether to use efficient k-d tree (always True in practice)
        
    Returns:
        List of lists, where graph[i] contains indices of all neighbors of star i
    """
    # Convert star positions to numpy array for k-d tree construction
    positions = np.array([[node.x, node.y, node.z] for node in nodes])
    
    # Build k-d tree from positions - enables efficient range queries
    kdtree = KDTree(positions)
    
    # Query all neighbors within fuel distance for each star
    # query_ball_tree finds all points within distance 'fuel' from each point
    # Returns: graph[i] = [indices of stars within fuel distance of star i]
    # This is much faster than checking all pairwise distances (O(n²))
    graph = kdtree.query_ball_tree(kdtree, fuel)
    
    # Remove self-loops - a star shouldn't be considered its own neighbor
    # Each star appears in its own neighbor list initially, so we remove it
    for i in range(len(graph)):
        if i in graph[i]:
            graph[i].remove(i)  # Remove star i from its own neighbor list
    
    return graph  # Return adjacency list representation of graph

def get_neighbors(nodes, kdtree, star_index, fuel):
    """
    Get all neighbors of a specific star within a given fuel range.
    Also returns the exact distance to each neighbor for more detailed analysis.
    
    This is useful for:
    - Finding reachable stars from a given starting point
    - Computing shortest paths between stars
    - Analyzing local stellar density
    
    Args:
        nodes: List of all StarNode objects
        kdtree: Pre-built KDTree for efficient spatial queries
        star_index: Index of the star to query neighbors for
        fuel: Maximum distance to search for neighbors
        
    Returns:
        List of dictionaries with 'index' and 'distance' for each neighbor
        Sorted by distance (closest first) due to k-nearest-neighbor query
    """
    # Get position of the query star as 2D array (kdtree.query expects this shape)
    position = np.array([[nodes[star_index].x, nodes[star_index].y, nodes[star_index].z]])
    
    # Query k-nearest neighbors within fuel distance
    # k=100: Get up to 100 closest neighbors
    # distance_upper_bound=fuel: Only return stars within fuel distance
    # Returns: (distances, indices) - both are arrays
    distances, indices = kdtree.query(position, k=100, distance_upper_bound=fuel)
    
    # Filter results to remove invalid entries
    # np.inf distance means no star was found within fuel range at that position
    # Also exclude the star itself (when idx == star_index)
    valid_neighbors = [
        {'index': int(idx), 'distance': float(dist)}  # Convert numpy types to Python types for JSON
        for dist, idx in zip(distances[0], indices[0])  # [0] because query returns 2D arrays
        if dist != np.inf and idx != star_index  # Filter: exclude infinite distances and self
    ]
    
    return valid_neighbors  # Return list of neighbors with their distances
