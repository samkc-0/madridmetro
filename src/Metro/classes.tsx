import * as THREE from "three";

import { lines } from "@/metro/data/lines.json";
import type { Graph, Edge, Vertex } from "@/types/graph";

export type LineNumber = keyof typeof lines;
import { coordinates } from "@/metro/data/stations.json";
import { getMapAspectRatio, normalizeCoordinates } from "@/metro/utilities";

const aspectRatio = getMapAspectRatio(coordinates);
const scaleFactor = 32;
const positions = normalizeCoordinates(
  coordinates,
  scaleFactor * aspectRatio,
  scaleFactor,
);

function randomUUID() {
  if (self?.crypto?.randomUUID) {
    return self.crypto.randomUUID();
  } else {
    let now = Date.now();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (now + Math.random() * 16) % 16 | 0;
      now = Math.floor(now / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

interface IMetroLine {
  Vertices: Vertex[];
  Edges: Edge[];
}

export class MetroLine implements IMetroLine {
  private lineNumber: LineNumber;
  private color: string;
  private stations: string[];
  private vertices?: Vertex[];
  private edges?: Edge[];
  private loop: boolean;
  constructor(lineNumber: LineNumber, loop: boolean = false) {
    this.lineNumber = lineNumber;
    this.loop = loop;
    this.color = lines[lineNumber].color;
    this.stations = lines[lineNumber].stations;
    this.vertices = undefined;
    this.edges = undefined;
  }
  public get Color(): string {
    return this.color;
  }
  public get Line(): string {
    return this.lineNumber.toString();
  }
  public get Stations(): string[] {
    return this.stations;
  }
  public get Vertices(): Vertex[] {
    if (this.vertices == undefined) {
      this.vertices = this.stations.map((name) => {
        if (!positions[name])
          throw new Error(`Could not find coordinates for station '${name}'.`);
        const { x, y } = positions[name];
        return {
          id: name,
          // y is latitude (north-positive); negate it so higher latitude
          // maps to world -Z, which renders further from the camera
          // ("up"/away) rather than closer ("down"/toward the viewer).
          position: new THREE.Vector3(x, 0, -y),
        };
      });
    }
    return this.vertices;
  }
  public get Edges(): Edge[] {
    if (this.edges == undefined) {
      this.edges = this.stations.slice(1).map((_, i) => {
        return {
          id: randomUUID(),
          source: this.stations[i],
          target: this.stations[i + 1],
          color: this.color,
        };
      });
      if (this.loop)
        this.edges.push({
          id: randomUUID(),
          source: this.stations[this.stations.length - 1],
          target: this.stations[0],
          color: this.color,
        });
    }
    return this.edges;
  }
  public get Graph(): Graph {
    return { vertices: this.Vertices, edges: this.Edges };
  }
}

interface IMetroNetwork {
  Graph: Graph;
}

export class MetroNetwork implements IMetroNetwork {
  private vertices: Vertex[];
  private edges: Edge[];
  private graph?: Graph;
  constructor(metroLines: MetroLine[]) {
    this.vertices = [];
    this.edges = [];
    this.graph = undefined;
    for (const line of metroLines) {
      line.Vertices.forEach((v) => {
        if (!this.stations.includes(v.id)) {
          this.vertices.push(v);
        }
      });
      line.Edges.forEach((e) => {
        this.edges.push(e);
      });
    }
  }
  private get stations(): string[] {
    const vertices = this.vertices.map((v) => v.id);
    return [...new Set(vertices)];
  }
  public get Graph(): Graph {
    if (!this.graph) {
      this.graph = {
        vertices: this.vertices,
        edges: this.edges,
      };
    }
    return this.graph;
  }
}
