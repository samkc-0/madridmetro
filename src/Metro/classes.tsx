import * as THREE from "three";
import { lines } from "./data/lines.json";
import { coordinates } from "./data/stations.json";
import { getMapAspectRatio, normalizeCoordinates } from "./utilities";

const aspectRatio = getMapAspectRatio(coordinates);
const positions = normalizeCoordinates(coordinates, 20 * aspectRatio, 20);

export type LineNumber = keyof typeof lines;

export class MetroLine {
  private lineNumber: LineNumber;
  private color: string;
  private stations: string[];
  private vertices?: Vertex[];
  private edges?: Edge[];
  private loop: boolean;
  private journey: JourneySegment[];
  constructor(lineNumber: LineNumber, loop: boolean = false) {
    this.lineNumber = lineNumber;
    this.loop = loop;
    this.color = lines[lineNumber].color;
    this.stations = lines[lineNumber].stations;
    this.vertices = undefined;
    this.edges = undefined;
    this.journey = [];
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
          position: new THREE.Vector3(x, 0, y),
        };
      });
    }
    return this.vertices;
  }
  public get Edges(): Edge[] {
    if (this.edges == undefined) {
      this.edges = this.stations.slice(1).map((_, i) => {
        return {
          source: this.stations[i],
          target: this.stations[i + 1],
          color: this.color,
        };
      });
      if (this.loop)
        this.edges.push({
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

  public get Journey(): JourneySegment[] {
    const slowness = 1;
    if (!this.journey.length) {
      this.journey = this.Edges.map(({ source, target }, i) => {
        return {
          source,
          target,
          startTime: i * slowness,
          endTime: (i + 1) * slowness,
        };
      });
    }
    return this.journey;
  }
}

export class MetroNetwork {
  private vertices: Vertex[];
  private edges: Edge[];
  private journeys: JourneySegment[][];
  private graph?: Graph;
  constructor(metroLines: MetroLine[]) {
    this.vertices = [];
    this.edges = [];
    this.journeys = [];
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
      this.journeys.push(line.Journey);
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
  public get Journeys(): JourneySegment[][] {
    return this.journeys;
  }
}
