import * as THREE from "three";

declare global {
  interface Vertex {
    id: string;
    position: THREE.Vector3;
  }

  interface Edge {
    source: string;
    target: string;
    color?: string;
  }

  interface Graph {
    vertices: Vertex[];
    edges: Edge[];
  }

  /**
   * --- SCHEDULE PA' LA CÁPSULA VIAJERA ---
   * Cada segmento define desde qué vértice hasta qué vértice viaja la cápsula y en qué tiempo.
   */
  interface JourneySegment {
    source: string;
    target: string;
    startTime: number;
    endTime: number;
  }
}

export type { Vertex, Edge, Graph, MetroLine, MetroMap };
