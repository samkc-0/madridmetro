import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { lines } from "./metro_lines.json";
import { coordinates } from "./madrid_station_coordinates.json";
import { layoutGraph3D, normalizeCoordinates } from "./utilities";

type LineNumber = keyof typeof lines;

const positions = normalizeCoordinates(coordinates, 20);

class MetroLine {
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
    const journeySchedule: JourneySegment[] = this.Edges.map(
      ({ source, target }, i) => {
        return {
          source,
          target,
          startTime: i * slowness,
          endTime: (i + 1) * slowness,
        };
      }
    );
    return journeySchedule;
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
      this.graph = layoutGraph3D({
        vertices: this.vertices,
        edges: this.edges,
      });
    }
    return this.graph;
  }
  public get Journeys(): JourneySegment[][] {
    return this.journeys;
  }
}
/**
 * --- COMPONENTES DEL GRAFO ---
 */
const VertexMesh: React.FC<{ vertex: Vertex }> = ({ vertex }) => {
  return (
    <group>
      <mesh position={vertex.position}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <Text
        position={[
          vertex.position.x,
          vertex.position.y + 0.3,
          vertex.position.z,
        ]}
        fontSize={0.2}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {vertex.id}
      </Text>
    </group>
  );
};

const EdgeMesh: React.FC<{
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
}> = ({ start, end, color = "gray" }) => {
  const distance = start.distanceTo(end);
  const midpoint = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const axis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction);

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.03, 0.03, distance, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

/**
 * --- COMPONENTE DE LA CÁPSULA VIAJERA CON ORIENTACIÓN ---
 */
const CapsuleTraveler: React.FC<{
  schedule: JourneySegment[];
  vertexMap: Map<string, Vertex>;
}> = ({ schedule, vertexMap }) => {
  const capsuleRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const currentPos = new THREE.Vector3();
    const currentQuat = new THREE.Quaternion();

    if (schedule.length === 0) return;

    if (t < schedule[0].startTime) {
      const initialVertex = vertexMap.get(schedule[0].source);
      if (initialVertex) {
        currentPos.copy(initialVertex.position);
        const targetVertex = vertexMap.get(schedule[0].target);
        if (targetVertex) {
          const direction = new THREE.Vector3()
            .subVectors(targetVertex.position, initialVertex.position)
            .normalize();
          currentQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      }
    } else if (t >= schedule[schedule.length - 1].endTime) {
      const lastSegment = schedule[schedule.length - 1];
      const lastVertex = vertexMap.get(lastSegment.target);
      if (lastVertex) {
        currentPos.copy(lastVertex.position);
        const sourceVertex = vertexMap.get(lastSegment.source);
        if (sourceVertex) {
          const direction = new THREE.Vector3()
            .subVectors(lastVertex.position, sourceVertex.position)
            .normalize();
          currentQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      }
    } else {
      const segment = schedule.find(
        (seg) => t >= seg.startTime && t <= seg.endTime
      );
      if (segment) {
        const sourceVertex = vertexMap.get(segment.source);
        const targetVertex = vertexMap.get(segment.target);
        if (sourceVertex && targetVertex) {
          const progress =
            (t - segment.startTime) / (segment.endTime - segment.startTime);
          currentPos
            .copy(sourceVertex.position)
            .lerp(targetVertex.position, progress);
          const direction = new THREE.Vector3()
            .subVectors(targetVertex.position, sourceVertex.position)
            .normalize();
          currentQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      }
    }

    if (capsuleRef.current) {
      capsuleRef.current.position.copy(currentPos);
      capsuleRef.current.quaternion.copy(currentQuat);
    }
  });

  return (
    <mesh ref={capsuleRef}>
      <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
      <meshBasicMaterial color="white" />
    </mesh>
  );
};

/**
 * --- COMPONENTE DEL GRAFO 3D ---
 */
const Graph3D: React.FC<{
  graph: Graph;
  journeySchedules?: JourneySegment[][];
}> = ({ graph, journeySchedules }) => {
  const vertexMap = new Map<string, Vertex>(
    graph.vertices.map((v) => [v.id, v])
  );
  return (
    <group name="graph-3d" rotation-x={0}>
      {graph.vertices.map((vertex) => (
        <VertexMesh key={vertex.id} vertex={vertex} />
      ))}
      {graph.edges.map((edge, index) => {
        const startVertex = vertexMap.get(edge.source);
        const endVertex = vertexMap.get(edge.target);
        if (!startVertex || !endVertex) return null;
        return (
          <EdgeMesh
            key={index}
            start={startVertex.position}
            end={endVertex.position}
            color={edge.color}
          />
        );
      })}
      {journeySchedules?.map((schedule, i) => (
        <CapsuleTraveler
          key={`journey-${i}`}
          schedule={schedule}
          vertexMap={vertexMap}
        />
      ))}
    </group>
  );
};

/**
 * --- ESCENA Y APP ---
 */
const Scene: React.FC = () => {
  const { graph, schedules }: { graph: Graph; schedules: JourneySegment[][] } =
    useMemo(() => {
      const line = new MetroLine(1);
      const graph = line.Graph;
      const schedules = [line.Journey];
      return { graph, schedules };
    }, []);
  const { camera } = useThree();
  useFrame(() => {
    camera.lookAt(graph.vertices[0].position);
  });
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <Graph3D graph={graph} journeySchedules={schedules} />
      {/* orbit controls pa’ mover la cámara a tu gusto */}
      <OrbitControls />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 3, 15], zoom: 1, rotation: [0, 0, 0] }}>
      <Scene />
    </Canvas>
  );
};

export default App;
