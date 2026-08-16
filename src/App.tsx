import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";

import { Graph3D } from "@/components/graph-3d";
import { LineToggleGrid } from "@/components/line-toggle-grid";
import { Madrid } from "@/metro/madrid";

import type { Graph } from "@/types/graph";

const Scene: React.FC<{ activeLines: Set<string> }> = ({ activeLines }) => {
  const graph: Graph = useMemo(() => Madrid.Graph, []);

  return (
    <group name="scene">
      <MapControls makeDefault />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <Graph3D graph={graph} activeLines={activeLines} />
    </group>
  );
};

const App: React.FC = () => {
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set());

  const toggleLine = (line: string) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{
          fov: 60,
          near: 0.1,
          far: 2000,
          position: [0, 20, 30],
        }}
      >
        <Scene activeLines={activeLines} />
      </Canvas>
      <LineToggleGrid activeLines={activeLines} onToggle={toggleLine} />
    </div>
  );
};

export default App;
