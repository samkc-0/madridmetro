import { lineColors, lineNumbers } from "@/metro/lineInfo";

function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "black" : "white";
}

export const LineToggleGrid: React.FC<{
  activeLines: Set<string>;
  onToggle: (line: string) => void;
}> = ({ activeLines, onToggle }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 10,
        display: "grid",
        gridTemplateColumns: "repeat(4, 2.75rem)",
        gap: "0.5rem",
      }}
    >
      {lineNumbers.map((number) => {
        const color = lineColors[number];
        const active = activeLines.has(number);
        return (
          <button
            key={number}
            onClick={() => onToggle(number)}
            title={`Toggle line ${number} station labels`}
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.15rem",
              border: "none",
              background: color,
              color: readableTextColor(color),
              fontWeight: 800,
              fontSize: "1.35rem",
              lineHeight: 1,
              cursor: "pointer",
              opacity: active ? 1 : 0.5,
              boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              transition: "opacity 0.15s",
            }}
          >
            {number}
          </button>
        );
      })}
    </div>
  );
};
