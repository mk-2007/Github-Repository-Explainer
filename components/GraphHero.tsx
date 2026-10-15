"use client";

// High-performance ambient dependency graph hero.
// Designed with GPU-accelerated opacity/stroke animations (no CPU-pegging drop-shadow filters)
// to ensure silky smooth 60fps rendering without eating system resources.

const NODES: { x: number; y: number }[] = [
  { x: 60, y: 200 },
  { x: 60, y: 300 },
  { x: 220, y: 120 },
  { x: 220, y: 240 },
  { x: 220, y: 360 },
  { x: 400, y: 80 },
  { x: 400, y: 200 },
  { x: 400, y: 320 },
  { x: 400, y: 420 },
  { x: 580, y: 150 },
  { x: 580, y: 280 },
  { x: 740, y: 100 },
  { x: 740, y: 220 },
  { x: 740, y: 340 },
];

const EDGES: [number, number][] = [
  [0, 2], [0, 3], [1, 3], [1, 4],
  [2, 5], [2, 6], [3, 6], [3, 7], [4, 7], [4, 8],
  [6, 9], [7, 9], [7, 10], [8, 10],
  [9, 11], [9, 12], [10, 12], [10, 13],
];

const STAGGER = 0.35;
const CYCLE = NODES.length * STAGGER + 2;

export default function GraphHero() {
  return (
    <svg
      viewBox="0 0 800 500"
      className="graph-hero"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mintGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <style>{`
        .graph-hero { width: 100%; height: 100%; }
        .edge {
          stroke: #262c3a;
          stroke-width: 1.5;
          opacity: 0.6;
        }
        .node-glow {
          fill: url(#mintGlow);
          opacity: 0;
          animation: glowPulse ${CYCLE}s ease-in-out infinite;
          transform-origin: center;
        }
        .node {
          fill: #171c28;
          stroke: #2c3342;
          stroke-width: 1.5;
          animation: light ${CYCLE}s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 94% { opacity: 0; transform: scale(0.8); }
          3%, 8% { opacity: 1; transform: scale(1.4); }
          14% { opacity: 0; transform: scale(0.8); }
        }
        @keyframes light {
          0%, 94% { fill: #171c28; stroke: #2c3342; }
          2%, 8% { fill: #1a3329; stroke: #6ee7b7; stroke-width: 2.2; }
          14% { fill: #171c28; stroke: #2c3342; stroke-width: 1.5; }
        }
      `}</style>
      {EDGES.map(([a, b], i) => (
        <line
          key={`edge-${i}`}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          className="edge"
        />
      ))}
      {NODES.map((n, i) => (
        <g key={`node-group-${i}`}>
          {/* Hardware-accelerated radial glow circle */}
          <circle
            cx={n.x}
            cy={n.y}
            r={24}
            className="node-glow"
            style={{ animationDelay: `${i * STAGGER}s` }}
          />
          {/* Main node circle */}
          <circle
            cx={n.x}
            cy={n.y}
            r={10}
            className="node"
            style={{ animationDelay: `${i * STAGGER}s` }}
          />
        </g>
      ))}
    </svg>
  );
}
