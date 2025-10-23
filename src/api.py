from fastapi import FastAPI
from backend import load_stars, build_graph

app = FastAPI()


@app.get("/")
async def root():
    return {"backend is running"}

@app.get("/graph")
async def get_graph(fuel: float = 5.0):
    filepath = "public/stars.csv"
    nodes = load_stars(filepath)
    graph = build_graph(nodes, fuel)
    return {"graph": graph}