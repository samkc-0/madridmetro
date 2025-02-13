/**
 * Normaliza las coordenadas de las estaciones del metro de Madrid
 * @param coordinates Objeto con las coordenadas x, y de las estaciones
 * @returns Objeto con las coordenadas normalizadas entre 0 y 1
 */
export function normalizeCoordinates(
  coordinates: Record<string, { x: number; y: number }>,
  scaleFactor: number = 1
) {
  // Si no hay coordenadas, regresamos un objeto vacío
  if (Object.keys(coordinates).length === 0) {
    return {};
  }

  // Si solo hay una estación, regresamos {x: 0, y: 0}
  if (Object.keys(coordinates).length === 1) {
    const [station] = Object.keys(coordinates);
    return { [station]: { x: 0, y: 0 } };
  }

  // Primero encontramos los valores mínimos y máximos
  const allX = Object.values(coordinates).map((coord) => coord.x);
  const allY = Object.values(coordinates).map((coord) => coord.y);

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  // Normalizamos cada coordenada
  const normalized: Record<string, { x: number; y: number }> = {};

  for (const [station, coord] of Object.entries(coordinates)) {
    normalized[station] = {
      x: ((coord.x - minX) / (maxX - minX)) * scaleFactor,
      y: ((coord.y - minY) / (maxY - minY)) * scaleFactor,
    };
  }

  return normalized;
}

import * as THREE from "three";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceX,
  forceY,
  forceZ,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force-3d";

// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// Graph Types
// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
export interface Vertex {
  id: string;
  position: THREE.Vector3;
}

export interface Edge {
  source: string;
  target: string;
  color?: string;
}

export interface Graph {
  vertices: Vertex[];
  edges: Edge[];
}

// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// layoutGraph3D Function
// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
/**
 * Runs a 3D force simulation on the provided graph and updates each vertex’s
 * THREE.Vector3 position.
 *
 * This version adds explicit forces on the x, y, and z axes. Without a dedicated
 * z-force (or if the initial z values are nearly equal), the simulation can collapse
 * to a nearly 2D layout.
 *
 * @param graph - The input graph containing vertices and edges.
 * @param iterations - The number of simulation ticks to run (default 300).
 * @returns The graph with updated vertex positions.
 */
export function layoutGraph3D(graph: Graph, iterations: number = 1000): Graph {
  // Create simulation nodes by “lifting” each vertex's THREE.Vector3 into x, y, and z.
  const nodes = graph.vertices.map((v) => ({
    ...v,
    x: v.position.x,
    y: v.position.y,
    z: v.position.z + Math.random(),
  })) as (Vertex & SimulationNodeDatum)[];

  // Create simulation links from the graph edges.
  // The simulation will resolve source/target using the node id.
  const links = graph.edges.map<
    Edge & SimulationLinkDatum<Vertex & SimulationNodeDatum>
  >((edge) => ({
    source: edge.source,
    target: edge.target,
    color: edge.color,
  }));

  // Create the force simulation.
  // Adjust the distance and strength parameters as needed for your graph.
  const simulation = forceSimulation(nodes)
    // Link force: connects nodes based on edges.
    .force(
      "link",
      forceLink(links)
        .id((d: Vertex & SimulationNodeDatum) => d.id)
        .distance(50)
    )
    // Repulsive force between nodes.
    .force("charge", forceManyBody().strength(-20))
    // Centering force: pulls nodes toward the origin.
    .force("center", forceCenter(0, 0, 0))
    // Forces for each axis ensure movement in 3D.
    .force("x", forceX(500).strength(1))
    .force("y", forceY(50).strength(1))
    .force("z", forceZ(500).strength(10));

  // Run the simulation for a fixed number of ticks.
  simulation.tick(iterations);
  simulation.stop();

  // Update the original vertex positions from the simulation's computed coordinates.
  nodes.forEach((node) => {
    const vertex = graph.vertices.find((v) => v.id === node.id);
    if (
      vertex &&
      node.x !== undefined &&
      node.y !== undefined &&
      node.z !== undefined
    ) {
      vertex.position.set(node.x, node.y, node.z);
    }
  });

  return graph;
}
