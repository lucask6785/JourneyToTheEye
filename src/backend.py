# backend.py
import csv
import numpy as np
from scipy.spatial import KDTree

class StarNode:
    def __init__(self, id, x, y, z, **metadata):
        self.id = id
        self.x = x
        self.y = y
        self.z = z
        self.metadata = metadata  # store any extra columns

def load_stars(filepath):
    nodes = []
    with open(filepath, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)  # Use DictReader for easier access
        for row in reader:
            # Adjust column names based on your CSV
            newStar = StarNode(
                id=int(row['id']),  
                x=float(row['x']),   # column 17
                y=float(row['y']),   # column 18
                z=float(row['z']),   # column 19
                # Add any other metadata you want
                name=row.get('name', ''),
                magnitude=float(row.get('mag', 0))
            )
            nodes.append(newStar)
    return nodes

def build_kdtree_data(nodes):
    """Convert nodes to format suitable for client-side k-d tree"""
    # Extract positions as numpy array
    positions = np.array([[node.x, node.y, node.z] for node in nodes])
    
    # Build k-d tree for server-side queries
    kdtree = KDTree(positions)
    
    # Prepare metadata
    metadata = [
        {
            'id': node.id,
            'name': node.metadata.get('name', f'Star-{node.id}'),
            'magnitude': node.metadata.get('magnitude', 0)
        }
        for node in nodes
    ]
    
    return {
        'positions': positions.tolist(),  # [[x,y,z], ...]
        'metadata': metadata,
        'bounds': {
            'min': positions.min(axis=0).tolist(),
            'max': positions.max(axis=0).tolist()
        },
        'count': len(nodes)
    }

def build_graph(nodes, fuel, use_kdtree=True):
    """Build adjacency graph using k-d tree for efficiency"""
    if not use_kdtree:
        # Your original O(n²) method - keep for small datasets
        graph = []
        for i in range(len(nodes)):
            graph.append([])
            for j in range(len(nodes)):
                if i != j and nodes[i].distance(nodes[j]) <= fuel:
                    graph[i].append(j)  # Store index, not 1
        return graph
    
    # Efficient k-d tree method - O(n log n)
    positions = np.array([[node.x, node.y, node.z] for node in nodes])
    kdtree = KDTree(positions)
    
    # Query all neighbors within fuel distance for each star
    # Returns list of lists of neighbor indices
    graph = kdtree.query_ball_tree(kdtree, fuel)
    
    # Remove self from neighbors
    for i in range(len(graph)):
        if i in graph[i]:
            graph[i].remove(i)
    
    return graph

def get_neighbors(nodes, kdtree, star_index, fuel):
    """Get neighbors of a specific star within fuel range"""
    position = np.array([[nodes[star_index].x, nodes[star_index].y, nodes[star_index].z]])
    distances, indices = kdtree.query(position, k=100, distance_upper_bound=fuel)
    
    # Filter out infinity distances and self
    valid_neighbors = [
        {'index': int(idx), 'distance': float(dist)}
        for dist, idx in zip(distances[0], indices[0])
        if dist != np.inf and idx != star_index
    ]
    
    return valid_neighbors