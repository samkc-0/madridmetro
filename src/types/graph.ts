import * as THREE from "three";

export type Vertex = {
  id: string;
  position: THREE.Vector3;
};

export type Edge = {
  id: string;
  source: string;
  color?: string;
};

export type Graph = {
  vertices: Vertex[];
  edges: Edge[];
};

export type JourneySegment = {
  source: string;
  target: string;
  startTime: number;
  endTime: number;
};
