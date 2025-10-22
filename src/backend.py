import csv
import math

fuel = 5

class StarNode:
    def __init__(self, id, x, y, z):
        self.id = id
        self.x = x
        self.y = y
        self.z = z

    def distance(self, node):
        starLocation = (self.x, self.y, self.z)
        otherLocation = (node.x, node.y, node.z)
        return math.dist(starLocation, otherLocation)

nodes = []

filepath = "public/stars.csv"
with open(filepath, 'r', newline='', encoding='utf-8') as file:
    reader = csv.reader(file)
    reader = list(reader)
    for row in range(len(reader)):
        if row == 0:
            continue
        newStar = StarNode(int(reader[row][0]), float(reader[row][17]), float(reader[row][18]), float(reader[row][19]))
        nodes.append(newStar)

graph = []

for i in range(len(nodes)):
    graph.append([])
    for j in range(len(nodes)):
        if nodes[i].distance(nodes[j]) <= fuel:
            graph[i].append(1)
        else:
            graph[i].append(0)

print(graph)
