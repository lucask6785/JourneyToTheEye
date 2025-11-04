# backend.py
import csv
import numpy as np
from scipy.spatial import KDTree
import math
import heapq


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


def build_graph(nodes, fuel):
    """Build adjacency graph using k-d tree for efficiency"""
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


def distance(nodes, star1, star2):
    star1 = nodes[star1]
    star2 = nodes[star2]
    star1 = [star1.x, star1.y, star1.z]
    star2 = [star2.x, star2.y, star2.z]
    return math.dist(star1, star2)


def djikstras(nodes, graph, startStar, goalStar):
    dist = []
    min_heap = []
    parent = {}
    sequence = []
    parent[startStar] = None
    heapq.heappush(min_heap, (0, startStar))
    for i in range(len(graph)):
        if i == startStar:
            dist.append(0)
        else:
            dist.append(math.inf)


    while min_heap:
        d, u = heapq.heappop(min_heap)
        if dist[u] < d:
            continue
        if u == goalStar:
            break
        for v in graph[u]:
            new_dist = d + distance(nodes, u, v)
            if dist[v] > new_dist:
                dist[v] = new_dist
                parent[v] = u
                heapq.heappush(min_heap, (new_dist, v))


    if dist[goalStar] == math.inf:
        return ([], -1)


    current = goalStar
    while current != startStar:
        sequence.insert(0, current)
        current = parent[current]
    sequence.insert(0, startStar)


    return (sequence, dist[goalStar])


def astar(nodes, graph, startStar, goalStar):
    open_heap = []
    heapq.heappush(open_heap, (0, startStar))
    parent = {}
    sequence = []
    f_score = []
    g_score = []
    parent[startStar] = None

    for i in range(len(graph)):
        if i != startStar:
            f_score.append(math.inf)
            g_score.append(math.inf)
        else:
            f_score.append(distance(nodes, startStar, goalStar)) # f = 0 + distance to goal
            g_score.append(0) # g is distance of path

    while open_heap:
        d, u = heapq.heappop(open_heap)

        if u == goalStar:
            break

        for neighbor in graph[u]:
            calculated_g = g_score[u] + distance(nodes, u, neighbor)
            if calculated_g < g_score[neighbor]:
                parent[neighbor] = u
                g_score[neighbor] = calculated_g
                f_score[neighbor] = calculated_g + distance(nodes, neighbor, goalStar)
                heapq.heappush(open_heap, (f_score[neighbor], neighbor))

    if g_score[goalStar] == math.inf:
        return ([], -1)

    curr = goalStar
    while curr != startStar:
        sequence.insert(0, curr)
        curr = parent[curr]
    sequence.insert(0, startStar)
    return (sequence, g_score[goalStar])

if __name__ == "__main__":
    import time
    start_time = time.perf_counter()
    nodes = load_stars("../../public/stars.csv")
    graph = build_graph(nodes, 50)
    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print(f"Elapsed time: {elapsed_time:.4f} seconds")

    start_time = time.perf_counter()
    sequence, dist = djikstras(nodes, graph, 0, 1)
    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print(f"Elapsed time (Dijkstra's): {elapsed_time:.4f} seconds")
    print(dist, sequence)

    # for i in sequence:
    #     star = nodes[i]
    #     print(star.x, star.y, star.z)

    start_time = time.perf_counter()
    sequence, dist = astar(nodes, graph, 0, 1)
    end_time = time.perf_counter()
    elapsed_time = end_time - start_time
    print(f"Elapsed time (A*): {elapsed_time:.4f} seconds")
    print(dist, sequence)

    # for i in sequence:
    #     star = nodes[i]
    #     print(star.x, star.y, star.z)